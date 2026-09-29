const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TunnelManager {
  constructor() {
    this.process = null;
    this.publicUrl = null;
    this.provider = 'cloudflare';
    this.isStarting = false;
    this.status = 'offline'; // 'offline' | 'starting' | 'online' | 'error'
    this.errorMessage = null;
    this.port = 3000;
    this.reconnectTimer = null;
    this.healthCheckInterval = null;

    // Graceful cleanup
    process.on('exit', () => this.stop());
    process.on('SIGINT', () => {
      this.stop();
      process.exit();
    });
  }

  getCloudflaredBinary() {
    try {
      const cloudflared = require('cloudflared');
      if (cloudflared.bin && fs.existsSync(cloudflared.bin)) {
        return cloudflared.bin;
      }
    } catch (e) {}

    const candidates = [
      path.resolve(path.dirname(process.execPath), 'cloudflared.exe'),
      path.resolve(process.cwd(), 'cloudflared.exe'),
      path.resolve(process.cwd(), 'dist', 'cloudflared.exe'),
      path.resolve(__dirname, '..', 'dist', 'cloudflared.exe'),
      path.resolve(__dirname, '..', 'node_modules', 'cloudflared', 'bin', 'cloudflared.exe'),
      path.resolve(__dirname, 'cloudflared.exe'),
      path.resolve(require('os').tmpdir(), 'local-video-streamer', 'cloudflared.exe'),
      'cloudflared'
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return 'cloudflared';
  }

  async start(port = 3000, { timeoutMs = 35000 } = {}) {
    this.port = port;

    if (this.status === 'online' && this.publicUrl) {
      return this.publicUrl;
    }
    if (this.isStarting) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!this.isStarting) {
            clearInterval(interval);
            resolve(this.publicUrl);
          }
        }, 300);
      });
    }

    this.isStarting = true;
    this.status = 'starting';
    this.errorMessage = null;

    try {
      const cfUrl = await this.startCloudflare(port, timeoutMs);
      this.publicUrl = cfUrl;
      this.status = 'online';
      console.log(`[Tunnel] Cloudflare Tunnel established & verified: ${cfUrl}`);
      
      // Start active background health check
      this.startHealthCheck();
      
      return cfUrl;
    } catch (err) {
      this.status = 'error';
      this.errorMessage = err.message;
      console.error(`[Tunnel] Cloudflare Tunnel failed: ${err.message}`);
      throw err;
    } finally {
      this.isStarting = false;
    }
  }

  startCloudflare(port, timeoutMs) {
    return new Promise((resolve, reject) => {
      const binPath = this.getCloudflaredBinary();
      
      // --protocol http2 forces robust TCP 443 instead of UDP QUIC (prevents 503 Tunnel Unavailable on ISP/firewall blocks)
      const args = [
        'tunnel',
        '--url', `http://127.0.0.1:${port}`,
        '--protocol', 'http2',
        '--no-autoupdate',
        '--edge-ip-version', '4',
        '--grace-period', '10s'
      ];

      const child = spawn(binPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      this.process = child;

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.stop();
          reject(new Error(`Cloudflare tunnel timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      let foundUrl = null;
      let isRegistered = false;

      const triggerResolve = () => {
        if (foundUrl && !resolved) {
          resolved = true;
          clearTimeout(timer);
          setTimeout(() => {
            resolve(foundUrl);
          }, 2500);
        }
      };

      const onOutput = (chunk) => {
        const text = chunk.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !foundUrl) {
          foundUrl = match[0];
          if (isRegistered) {
            triggerResolve();
          } else {
            setTimeout(triggerResolve, 4000);
          }
        }
        if (text.includes('Registered tunnel connection') || text.includes('Registered tunnel') || text.includes('Connection registered')) {
          isRegistered = true;
          if (foundUrl) {
            triggerResolve();
          }
        }
      };

      child.stderr.on('data', onOutput);
      child.stdout.on('data', onOutput);

      child.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      child.on('exit', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(new Error(`Cloudflare exited prematurely with code ${code}`));
        } else {
          this.status = 'offline';
          this.publicUrl = null;
          // Auto reconnect after 3 seconds if unexpected exit
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            console.log('[Tunnel] Auto-reconnecting Cloudflare tunnel...');
            this.start(this.port).catch(() => {});
          }, 3000);
        }
      });
    });
  }

  startHealthCheck() {
    clearInterval(this.healthCheckInterval);
    let consecutiveFailures = 0;
    this.healthCheckInterval = setInterval(async () => {
      if (this.status === 'online' && this.publicUrl) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(`${this.publicUrl}/api/status`, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          });
          clearTimeout(timer);
          if (!res.ok && (res.status === 503 || res.status === 502)) {
            consecutiveFailures++;
            if (consecutiveFailures >= 3) {
              console.warn(`[Tunnel] Health check failed 3 consecutive times (${res.status}). Restarting tunnel...`);
              consecutiveFailures = 0;
              this.stop();
              this.start(this.port).catch(() => {});
            }
          } else {
            consecutiveFailures = 0;
          }
        } catch (err) {
          // Network fluctuation or temporary glitch
        }
      }
    }, 30000);
  }

  stop() {
    clearInterval(this.healthCheckInterval);
    clearTimeout(this.reconnectTimer);
    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch (e) {}
      this.process = null;
    }
    this.status = 'offline';
    this.publicUrl = null;
  }

  getStatus() {
    return {
      status: this.status,
      publicUrl: this.publicUrl,
      provider: 'cloudflare',
      errorMessage: this.errorMessage
    };
  }
}

const defaultTunnelManager = new TunnelManager();
module.exports = { TunnelManager, defaultTunnelManager };
