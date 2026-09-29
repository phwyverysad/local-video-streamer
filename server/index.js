const { exec } = require('child_process');
const { createApp } = require('./app');
const { defaultTunnelManager } = require('./tunnel');

const PORT = process.env.PORT || 3000;
const app = createApp();

// Explicitly bind to '0.0.0.0' to ensure Cloudflare tunnel local proxy 127.0.0.1 connects instantly without 503
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n========================================================');
  console.log('[App] Local Video Streamer running');
  console.log(`[Dashboard] http://localhost:${PORT}`);
  console.log('[Tunnel] Connecting to Secure Cloudflare Tunnel (HTTP/2)...');
  console.log('========================================================\n');

  // Auto open browser on Windows when running standalone or server start
  if (process.env.AUTO_OPEN !== 'false' && process.env.NODE_ENV !== 'test') {
    const cmd = process.platform === 'win32' ? `start http://localhost:${PORT}` : `open http://localhost:${PORT}`;
    exec(cmd, (err) => {
      if (err) console.log(`[Notice] Open your browser at http://localhost:${PORT}`);
    });
  }

  try {
    const publicUrl = await defaultTunnelManager.start(PORT);
    console.log('[Tunnel] Cloudflare Tunnel Ready');
    console.log(`[Public Link Base] ${publicUrl}`);
    console.log('[Ready] Instant video sharing is active\n');
  } catch (err) {
    console.warn('[Tunnel] Could not establish public tunnel:', err.message);
    console.log('[Notice] System running in local network mode (Localhost)');
  }
});

function gracefulShutdown() {
  console.log('\n[App] Shutting down...');
  defaultTunnelManager.stop();
  server.close(() => {
    console.log('[App] Server stopped successfully');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
