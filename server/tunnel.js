const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TunnelManager {
  constructor() {
    this.process = null;
    this.localtunnelInstance = null;
    this.publicUrl = null;
    this.provider = null;
    this.isStarting = false;
    this.status = 'offline'; // 'offline' | 'starting' | 'online' | 'error'
    this.errorMessage = null;

    // Graceful cleanup
    process.on('exit', () => this.stop());
    process.on('SIGINT', () => {
      this.stop();
      process.exit();
    });
  }

  async start(port = 3000, { timeoutMs = 25000 } = {}) {
    if (this.status === 'online' && this.publicUrl) {
      return this.publicUrl;
    }
    if (this.isStarting) {
      // Wait for existing start attempt
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
      // 1. Try Localtunnel first (loca.lt is fully supported and whitelisted by da.gd)
      const ltUrl = await this.startLocaltunnel(port, 15000);
      this.publicUrl = ltUrl;
      this.provider = 'localtunnel';
      this.status = 'online';
      console.log(`[Tunnel] Localtunnel established: ${ltUrl}`);
      return ltUrl;
    } catch (ltErr) {
      console.warn(`[Tunnel] Localtunnel failed (${ltErr.message}), falling back to Cloudflare...`);

      try {
        // 2. Fallback to Cloudflare Quick Tunnel
        const cfUrl = await this.startCloudflare(port, timeoutMs);
        this.publicUrl = cfUrl;
        this.provider = 'cloudflare';
        this.status = 'online';
        console.log(`[Tunnel] Cloudflare tunnel established: ${cfUrl}`);
        return cfUrl;
      } catch (cfErr) {
        this.status = 'error';
        this.errorMessage = `Tunnel failed: LT (${ltErr.message}) / CF (${cfErr.message})`;
        console.error(`[Tunnel] All tunnel providers failed: ${this.errorMessage}`);
        throw new Error(this.errorMessage);
      }
    } finally {
      this.isStarting = false;
    }
  }

  startCloudflare(port, timeoutMs) {
    return new Promise((resolve, reject) => {
      let binPath = null;
      try {
        const cloudflared = require('cloudflared');
        binPath = cloudflared.bin;
      } catch (e) {
        binPath = path.resolve(__dirname, '..', 'node_modules', 'cloudflared', 'bin', 'cloudflared.exe');
      }

      if (!binPath || !fs.existsSync(binPath)) {
        return reject(new Error('cloudflared binary not found at ' + binPath));
      }

      const args = ['tunnel', '--url', `http://127.0.0.1:${port}`];
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

      const onOutput = (chunk) => {
        const text = chunk.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(match[0]);
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
        }
      });
    });
  }

  async startLocaltunnel(port, timeoutMs) {
    const localtunnel = require('localtunnel');
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Localtunnel timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      localtunnel({ port })
        .then((tunnel) => {
          if (resolved) {
            tunnel.close();
            return;
          }
          resolved = true;
          clearTimeout(timer);
          this.localtunnelInstance = tunnel;
          tunnel.on('close', () => {
            this.status = 'offline';
            this.publicUrl = null;
          });
          resolve(tunnel.url);
        })
        .catch((err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  stop() {
    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch (e) {}
      this.process = null;
    }
    if (this.localtunnelInstance) {
      try {
        this.localtunnelInstance.close();
      } catch (e) {}
      this.localtunnelInstance = null;
    }
    this.status = 'offline';
    this.publicUrl = null;
    this.provider = null;
  }

  getStatus() {
    return {
      status: this.status,
      publicUrl: this.publicUrl,
      provider: this.provider,
      errorMessage: this.errorMessage
    };
  }
}

// Export singleton instance or class
const defaultTunnelManager = new TunnelManager();
module.exports = { TunnelManager, defaultTunnelManager };
