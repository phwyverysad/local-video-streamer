const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const VideoRegistry = require('./registry');
const { streamVideo } = require('./stream');
const { shortenWithDaGd } = require('./shortener');
const { defaultTunnelManager } = require('./tunnel');

function createApp(options = {}) {
  const app = express();
  const uploadsDir = options.uploadsDir || path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const registry = options.registry || new VideoRegistry({
    storageFile: options.storageFile || path.join(__dirname, '..', 'data', 'shares.json')
  });
  const tunnelManager = options.tunnelManager || defaultTunnelManager;

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Multer setup for video uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      // Preserve extension with timestamp prefix
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safeName}`);
    }
  });

  const upload = multer({
    storage,
    limits: {
      // 50GB max local file size
      fileSize: 50 * 1024 * 1024 * 1024
    }
  });

  // Serve static UI assets
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Helper to format share with URLs
  function formatShare(share, req) {
    const host = req.get('host');
    const protocol = req.protocol;
    const localUrl = `${protocol}://${host}/v/${share.id}`;
    const tunnelStatus = tunnelManager.getStatus();
    const publicBase = tunnelStatus.publicUrl || localUrl;
    const publicUrl = `${publicBase}/v/${share.id}`;

    return {
      id: share.id,
      originalName: share.originalName,
      size: share.size,
      mimeType: share.mimeType,
      createdAt: share.createdAt,
      views: share.views || 0,
      isUploaded: share.isUploaded,
      localUrl,
      publicUrl,
      shortUrl: share.shortUrl || null
    };
  }

  // --- API Endpoints ---

  // 1. Get system & tunnel status
  app.get('/api/status', (req, res) => {
    res.json({
      server: 'running',
      tunnel: tunnelManager.getStatus()
    });
  });

  // 2. List all active shares
  app.get('/api/shares', (req, res) => {
    const list = registry.list().map(item => formatShare(item, req));
    res.json({ shares: list });
  });

  // 3. Upload video file directly via browser
  app.post('/api/shares/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    try {
      const share = registry.register({
        filePath: req.file.path,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        isUploaded: true
      });

      res.status(201).json({
        success: true,
        share: formatShare(share, req)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Register local file path directly (instant, zero-copy for huge files)
  app.post('/api/shares/local', (req, res) => {
    const { filePath } = req.body;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const cleanPath = filePath.trim().replace(/^["']|["']$/g, '');
    if (!fs.existsSync(cleanPath)) {
      return res.status(404).json({ error: 'File not found on disk at: ' + cleanPath });
    }

    try {
      const stat = fs.statSync(cleanPath);
      if (!stat.isFile()) {
        return res.status(400).json({ error: 'Specified path is not a file' });
      }

      const share = registry.register({
        filePath: cleanPath,
        originalName: path.basename(cleanPath),
        size: stat.size,
        isUploaded: false
      });

      res.status(201).json({
        success: true,
        share: formatShare(share, req)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Revoke / Delete a share
  app.delete('/api/shares/:id', (req, res) => {
    const { id } = req.params;
    const removed = registry.revoke(id, true);
    if (!removed) {
      return res.status(404).json({ error: 'Share not found or already removed' });
    }
    res.json({ success: true, id, message: 'Share removed and link invalidated' });
  });

  // 6. Shorten public link using da.gd
  app.post('/api/shares/:id/shorten', async (req, res) => {
    const { id } = req.params;
    const share = registry.get(id);
    if (!share) {
      return res.status(404).json({ error: 'Share not found or has been revoked' });
    }

    // Determine URL to shorten: prefer public tunnel URL, or supplied baseUrl, or req host
    const tunnelStatus = tunnelManager.getStatus();
    const publicBase = req.body.baseUrl || tunnelStatus.publicUrl || `${req.protocol}://${req.get('host')}`;
    const targetUrl = `${publicBase}/v/${share.id}`;

    try {
      const shortUrl = await shortenWithDaGd(targetUrl);
      registry.setShortUrl(id, shortUrl);
      res.json({
        success: true,
        id,
        targetUrl,
        shortUrl
      });
    } catch (err) {
      res.status(502).json({
        error: 'Failed to shorten URL with da.gd: ' + err.message,
        targetUrl
      });
    }
  });

  // 7. Get video metadata for public player
  app.get('/api/video-info/:id', (req, res) => {
    const { id } = req.params;
    const share = registry.get(id);
    if (!share) {
      return res.status(404).json({
        isAvailable: false,
        error: 'วิดีโอนี้ถูกลบหรือไม่สามารถเข้าถึงได้แล้ว'
      });
    }

    res.json({
      isAvailable: true,
      id: share.id,
      originalName: share.originalName,
      size: share.size,
      mimeType: share.mimeType,
      createdAt: share.createdAt,
      views: share.views || 0,
      streamUrl: `/api/stream/${share.id}`
    });
  });

  // 8. Stream video endpoint with Range support
  app.get('/api/stream/:id', (req, res) => {
    const { id } = req.params;
    const share = registry.get(id);
    if (!share) {
      return res.status(404).json({
        error: 'วิดีโอนี้ถูกลบหรือไม่สามารถเข้าถึงได้แล้ว (Video removed or revoked)'
      });
    }

    // Count view on first range chunk or direct play
    if (!req.headers.range || req.headers.range.startsWith('bytes=0-')) {
      registry.incrementViews(id);
    }

    streamVideo(req, res, share.filePath, share.mimeType);
  });

  // 9. Friend's player page route
  app.get('/v/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'player.html'));
  });

  // Expose registry & tunnel on app for testing
  app.registry = registry;
  app.tunnelManager = tunnelManager;

  return app;
}

module.exports = { createApp };
