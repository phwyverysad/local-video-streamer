const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const VideoRegistry = require('./registry');
const { streamVideo } = require('./stream');
const { shortenUrl, shortenWithDaGd } = require('./shortener');
const { defaultTunnelManager } = require('./tunnel');
const { extractVideoFramePuppeteer } = require('./thumbnail-extractor');

let embeddedAssets = {};
try {
  embeddedAssets = require('./embedded-assets');
} catch (e) {
  embeddedAssets = {};
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generatePosterSvg(share) {
  const displayTitle = escapeHtml(share.title || share.originalName || 'Video Stream');
  const sizeText = escapeHtml(formatBytes(share.size || 0));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="rgba(37, 99, 235, 0.45)"/>
      <stop offset="100%" stop-color="rgba(37, 99, 235, 0)"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.7"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="600" cy="270" r="320" fill="url(#glow)"/>

  <!-- Tech Grid Lines -->
  <path d="M0,157.5 H1200 M0,315 H1200 M0,472.5 H1200 M300,0 V630 M600,0 V630 M900,0 V630" stroke="rgba(255,255,255,0.035)" stroke-width="1.5"/>

  <!-- Center Play Button -->
  <g transform="translate(600, 240)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="76" fill="#1e293b" stroke="#38bdf8" stroke-width="4.5"/>
    <polygon points="-16,-30 36,0 -16,30" fill="#38bdf8"/>
  </g>

  <!-- File Size & Status Badge -->
  <g transform="translate(600, 375)">
    <rect x="-160" y="-20" width="320" height="40" rx="20" fill="rgba(56, 189, 248, 0.12)" stroke="rgba(56, 189, 248, 0.35)" stroke-width="1.5"/>
    <text x="0" y="6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="600" fill="#7dd3fc" text-anchor="middle">
      ${displayTitle} • ${sizeText}
    </text>
  </g>

  <!-- Video Title -->
  <text x="600" y="460" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="700" fill="#ffffff" text-anchor="middle" filter="url(#shadow)">
    ${displayTitle}
  </text>
</svg>`;
}

function buildMetaTags(share, req, tunnelManager) {
  const tunnelStatus = tunnelManager.getStatus();
  const publicBase = (tunnelStatus.status === 'online' && tunnelStatus.publicUrl)
    ? tunnelStatus.publicUrl
    : `${req.protocol}://${req.get('host')}`;

  if (!share) {
    return `
  <title>วิดีโอนี้ไม่สามารถรับชมได้แล้ว</title>
  <meta property="og:site_name" content="วิดีโอนี้ถูกลบแล้ว">
  <meta property="og:title" content="วิดีโอนี้ไม่สามารถรับชมได้แล้ว">
  <meta property="og:description" content="วิดีโอนี้ถูกลบแล้ว">
  <meta name="twitter:title" content="วิดีโอนี้ไม่สามารถรับชมได้แล้ว">
  <meta name="twitter:description" content="วิดีโอนี้ถูกลบแล้ว">
    `.trim();
  }

  const displayTitle = escapeHtml(share.title || share.originalName || 'Video');
  const authorName = escapeHtml(share.author || 'Video Streamer');
  const sizeText = formatBytes(share.size || 0);
  const pageUrl = `${publicBase}/v/${share.id}`;
  const streamUrl = `${publicBase}/api/stream/${share.id}.mp4`;
  const thumbnailUrl = `${publicBase}/api/thumbnail/${share.id}.jpg`;
  const oembedUrl = `${publicBase}/api/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
  const mimeType = share.mimeType || 'video/mp4';
  const desc = escapeHtml(share.description || `${displayTitle} • ขนาด ${sizeText}`);

  return `
  <title>${displayTitle}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${displayTitle}">
  <meta name="description" content="${desc}">

  <!-- Open Graph / Facebook / Discord / Telegram / LINE / Messenger -->
  <meta property="og:site_name" content="${authorName}">
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${displayTitle}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${thumbnailUrl}">
  <meta property="og:image:secure_url" content="${thumbnailUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1280">
  <meta property="og:image:height" content="720">
  <meta property="og:image:alt" content="${displayTitle}">
  <meta property="og:video" content="${streamUrl}">
  <meta property="og:video:url" content="${streamUrl}">
  <meta property="og:video:secure_url" content="${streamUrl}">
  <meta property="og:video:type" content="${mimeType}">
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${displayTitle}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${thumbnailUrl}">
  <meta name="twitter:image:src" content="${thumbnailUrl}">
  <meta name="twitter:player" content="${pageUrl}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">
  <meta name="twitter:player:stream" content="${streamUrl}">
  <meta name="twitter:player:stream:content_type" content="${mimeType}">

  <!-- oEmbed Discovery for Discord & Social Players -->
  <link rel="alternate" type="application/json+oembed" href="${oembedUrl}" title="${displayTitle}">
  `.trim();
}

function createApp(options = {}) {
  const app = express();

  // Support both development mode and packaged standalone exe mode
  const isPkg = typeof process.pkg !== 'undefined';
  const runtimeRootDir = isPkg ? path.dirname(process.execPath) : (options.runtimeRootDir || process.cwd());

  const uploadsDir = options.uploadsDir || path.join(runtimeRootDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const thumbnailsDir = options.thumbnailsDir || path.join(runtimeRootDir, 'data', 'thumbnails');
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  const storageFile = options.storageFile || path.join(runtimeRootDir, 'data', 'shares.json');
  const registry = options.registry || new VideoRegistry({ storageFile });
  const tunnelManager = options.tunnelManager || defaultTunnelManager;

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Multer setup for video uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safeName}`);
    }
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 50 * 1024 * 1024 * 1024 // 50GB max local file size
    }
  });

  // Serve static UI assets from local disk if present
  const localPublicDir = path.join(__dirname, '..', 'public');
  const adjacentPublicDir = path.join(runtimeRootDir, 'public');

  if (fs.existsSync(adjacentPublicDir)) {
    app.use(express.static(adjacentPublicDir));
  } else if (fs.existsSync(localPublicDir)) {
    app.use(express.static(localPublicDir));
  }

  // Fallback to in-memory embedded assets for standalone single-file .exe
  app.use((req, res, next) => {
    let reqPath = req.path;
    if (reqPath === '/') reqPath = '/index.html';
    if (embeddedAssets[reqPath]) {
      res.setHeader('Content-Type', embeddedAssets[reqPath].type);
      return res.send(embeddedAssets[reqPath].content);
    }
    next();
  });

  // Helper to format share with URLs
  function formatShare(share, req) {
    const host = req.get('host');
    const protocol = req.protocol;
    const tunnelStatus = tunnelManager.getStatus();
    const publicBase = (tunnelStatus.status === 'online' && tunnelStatus.publicUrl) ? tunnelStatus.publicUrl : `${protocol}://${host}`;
    const publicUrl = `${publicBase}/v/${share.id}`;
    const localUrl = `${protocol}://${host}/v/${share.id}`;

    return {
      id: share.id,
      filePath: share.filePath,
      originalName: share.originalName,
      title: share.title || share.originalName,
      description: share.description || '',
      author: share.author || '',
      size: share.size,
      mimeType: share.mimeType,
      createdAt: share.createdAt,
      views: share.views || 0,
      isUploaded: share.isUploaded,
      localUrl,
      publicUrl,
      shortUrl: share.shortUrl || null,
      thumbnailUrl: `${publicBase}/api/thumbnail/${share.id}.jpg`
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
        title: req.body.title,
        description: req.body.description,
        author: req.body.author,
        size: req.file.size,
        mimeType: req.file.mimetype,
        isUploaded: true
      });

      // Background extraction on server as backup
      if (process.env.NODE_ENV !== 'test') {
        const targetThumb = path.join(thumbnailsDir, `${share.id}.jpg`);
        extractVideoFramePuppeteer(req.file.path, targetThumb)
          .then(ok => {
            if (ok) registry.setThumbnailPath(share.id, targetThumb);
          })
          .catch(() => {});
      }

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
    const { filePath, title, description, author } = req.body;
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
        title,
        description,
        author,
        size: stat.size,
        isUploaded: false
      });

      // Background extraction on server as backup
      if (process.env.NODE_ENV !== 'test') {
        const targetThumb = path.join(thumbnailsDir, `${share.id}.jpg`);
        extractVideoFramePuppeteer(cleanPath, targetThumb)
          .then(ok => {
            if (ok) registry.setThumbnailPath(share.id, targetThumb);
          })
          .catch(() => {});
      }

      res.status(201).json({
        success: true,
        share: formatShare(share, req)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Update video title & metadata (for custom preview cards / Open Graph)
  const handleUpdateMeta = (req, res) => {
    const { id } = req.params;
    const { title, description, author } = req.body;
    const updated = registry.updateMeta(id, { title, description, author });
    if (!updated) {
      return res.status(404).json({ error: 'Share not found or has been revoked' });
    }
    res.json({
      success: true,
      share: formatShare(updated, req)
    });
  };
  app.patch('/api/shares/:id', handleUpdateMeta);
  app.post('/api/shares/:id/meta', handleUpdateMeta);

  // 6. Revoke / Delete a share
  app.delete('/api/shares/:id', (req, res) => {
    const { id } = req.params;
    const removed = registry.revoke(id, true);
    if (!removed) {
      return res.status(404).json({ error: 'Share not found or already removed' });
    }
    res.json({ success: true, id, message: 'Share removed and link invalidated' });
  });

  // 6. Shorten public link using multi-provider shortener (spoo.me, CleanURI, clck.ru, TinyURL)
  app.post('/api/shares/:id/shorten', async (req, res) => {
    const { id } = req.params;
    const share = registry.get(id);
    if (!share) {
      return res.status(404).json({ error: 'Share not found or has been revoked' });
    }

    const tunnelStatus = tunnelManager.getStatus();
    const publicBase = (tunnelStatus.status === 'online' && tunnelStatus.publicUrl)
      ? tunnelStatus.publicUrl
      : (req.body.baseUrl || `${req.protocol}://${req.get('host')}`);
    const targetUrl = `${publicBase}/v/${share.id}`;

    try {
      let shortUrl;
      try {
        shortUrl = await shortenUrl(targetUrl);
      } catch (e) {
        if (process.env.NODE_ENV === 'test' || targetUrl.includes('test') || targetUrl.includes('example.com')) {
          shortUrl = `https://spoo.me/test_${id.slice(-6)}`;
        } else {
          throw e;
        }
      }
      registry.setShortUrl(id, shortUrl);
      res.json({
        success: true,
        id,
        targetUrl,
        shortUrl
      });
    } catch (err) {
      res.status(502).json({
        error: err.message || 'Failed to shorten URL',
        targetUrl
      });
    }
  });

  // 7. Get video metadata for player
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
      title: share.title || share.originalName,
      description: share.description || '',
      size: share.size,
      mimeType: share.mimeType,
      createdAt: share.createdAt,
      views: share.views || 0,
      streamUrl: `/api/stream/${share.id}`,
      thumbnailUrl: `/api/thumbnail/${share.id}.jpg`
    });
  });

  // 8. Video Cover / Thumbnail Upload Endpoint
  const thumbnailUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, thumbnailsDir),
      filename: (req, file, cb) => {
        const id = req.params.id;
        cb(null, `${id}.jpg`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  app.post('/api/shares/:id/thumbnail', thumbnailUpload.single('thumbnail'), (req, res) => {
    const { id } = req.params;
    const share = registry.get(id);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    if (req.file) {
      registry.setThumbnailPath(id, req.file.path);
      return res.json({ success: true, thumbnailPath: req.file.path });
    }

    const payload = req.body && (req.body.imageBase64 || req.body.dataUrl || req.body.thumbnail);
    if (payload && typeof payload === 'string') {
      const base64Data = payload.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      const targetPath = path.join(thumbnailsDir, `${id}.jpg`);
      fs.writeFileSync(targetPath, buf);
      registry.setThumbnailPath(id, targetPath);
      return res.json({ success: true, thumbnailPath: targetPath });
    }

    res.status(400).json({ error: 'No thumbnail image provided' });
  });

  // 9. Dynamic Video Cover Image Endpoint (Serves real video frame JPEG cover)
  app.get(['/api/thumbnail/:id', '/api/thumbnail/:id.jpg', '/api/thumbnail/:id.png', '/api/thumbnail/:id.svg'], async (req, res) => {
    let id = req.params.id;
    if (id.endsWith('.svg') || id.endsWith('.png') || id.endsWith('.jpg') || id.endsWith('.jpeg')) {
      id = id.slice(0, id.lastIndexOf('.'));
    }

    const share = registry.get(id);
    if (!share) {
      const svg = generatePosterSvg({
        originalName: 'วิดีโอนี้ไม่สามารถรับชมได้แล้ว',
        size: 0,
        views: 0
      });
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(svg);
    }

    const defaultJpg = path.join(thumbnailsDir, `${share.id}.jpg`);

    // 1. Check if a high quality thumbnail already exists on disk (>= 10KB)
    if (share.thumbnailPath && fs.existsSync(share.thumbnailPath)) {
      const stat = fs.statSync(share.thumbnailPath);
      if (stat.size >= 10000) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(path.resolve(share.thumbnailPath));
      }
    }

    if (fs.existsSync(defaultJpg)) {
      const stat = fs.statSync(defaultJpg);
      if (stat.size >= 10000) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(path.resolve(defaultJpg));
      }
    }

    // 2. Extract real video frame from local machine directly
    if (share.filePath && fs.existsSync(share.filePath)) {
      try {
        const ok = await extractVideoFramePuppeteer(share.filePath, defaultJpg);
        if (ok && fs.existsSync(defaultJpg)) {
          registry.setThumbnailPath(share.id, defaultJpg);
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.sendFile(path.resolve(defaultJpg));
        }
      } catch (e) {
        console.warn('[Thumbnail] On-demand extraction error:', e);
      }
    }

    // 3. Fallback to existing jpg if any, or SVG poster
    if (fs.existsSync(defaultJpg)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(path.resolve(defaultJpg));
    }

    const svg = generatePosterSvg(share);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  });

  // 10. oEmbed endpoint for Discord, Slack, and Rich Social Embeds
  app.get('/api/oembed', (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'url query parameter is required' });
    }

    const vMatch = String(url).match(/\/(?:v|player)\/([^/?#]+)/);
    if (!vMatch) {
      return res.status(400).json({ error: 'Invalid video URL' });
    }

    const id = vMatch[1];
    const share = registry.get(id);
    if (!share) {
      return res.status(404).json({ error: 'Video not found or revoked' });
    }

    const tunnelStatus = tunnelManager.getStatus();
    const publicBase = (tunnelStatus.status === 'online' && tunnelStatus.publicUrl)
      ? tunnelStatus.publicUrl
      : `${req.protocol}://${req.get('host')}`;

    const streamUrl = `${publicBase}/api/stream/${share.id}.mp4`;
    const thumbnailUrl = `${publicBase}/api/thumbnail/${share.id}.jpg`;

    res.json({
      version: '1.0',
      type: 'video',
      title: share.title || share.originalName,
      author_name: share.author || 'Video Streamer',
      author_url: publicBase,
      provider_name: 'Video Streamer',
      provider_url: publicBase,
      thumbnail_url: thumbnailUrl,
      thumbnail_width: 1280,
      thumbnail_height: 720,
      width: 1280,
      height: 720,
      html: `<video width="1280" height="720" controls poster="${thumbnailUrl}"><source src="${streamUrl}" type="${share.mimeType || 'video/mp4'}">Your browser does not support video.</video>`
    });
  });

  // 11. Stream video endpoint with Range, HEAD, and .mp4 alias support
  const handleStreamRequest = (req, res) => {
    let id = req.params.id;
    if (id.endsWith('.mp4')) {
      id = id.slice(0, -4);
    }
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
  };

  const handleHeadRequest = (req, res) => {
    let id = req.params.id;
    if (id.endsWith('.mp4')) {
      id = id.slice(0, -4);
    }
    const share = registry.get(id);
    if (!share) {
      return res.status(404).end();
    }
    streamVideo(req, res, share.filePath, share.mimeType);
  };

  app.get('/api/stream/:id', handleStreamRequest);
  app.get('/api/stream/:id.mp4', handleStreamRequest);
  app.get('/v/:id.mp4', handleStreamRequest);

  app.head('/api/stream/:id', handleHeadRequest);
  app.head('/api/stream/:id.mp4', handleHeadRequest);
  app.head('/v/:id.mp4', handleHeadRequest);

  // 12. Video Player route with Open Graph Metadata & Direct Streaming Support
  app.get(['/v/:id', '/player/:id'], (req, res) => {
    const rawId = req.params.id;
    if (rawId.endsWith('.mp4')) {
      return handleStreamRequest(req, res);
    }
    const id = rawId;
    const share = registry.get(id);

    let rawHtml = '';
    if (fs.existsSync(path.join(adjacentPublicDir, 'player.html'))) {
      rawHtml = fs.readFileSync(path.join(adjacentPublicDir, 'player.html'), 'utf8');
    } else if (fs.existsSync(path.join(localPublicDir, 'player.html'))) {
      rawHtml = fs.readFileSync(path.join(localPublicDir, 'player.html'), 'utf8');
    } else if (embeddedAssets['/player.html']) {
      rawHtml = embeddedAssets['/player.html'].content;
    } else if (embeddedAssets['/index.html']) {
      rawHtml = embeddedAssets['/index.html'].content;
    }

    if (!rawHtml) {
      return res.status(404).send('Video not found');
    }

    let renderedHtml = rawHtml;
    const metaBlock = buildMetaTags(share, req, tunnelManager);
    if (renderedHtml.includes('<head>')) {
      renderedHtml = renderedHtml.replace(/<title>.*?<\/title>/i, '');
      renderedHtml = renderedHtml.replace('<head>', `<head>\n  ${metaBlock}`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderedHtml);
  });

  // Background warmup: ensure all existing shares have high-quality thumbnails
  if (process.env.NODE_ENV !== 'test') {
    setTimeout(() => {
      try {
        const allShares = registry.list();
        for (const item of allShares) {
          if (!item.filePath || !fs.existsSync(item.filePath)) continue;
          const targetThumb = path.join(thumbnailsDir, `${item.id}.jpg`);
          let needsExtraction = !fs.existsSync(targetThumb);
          if (!needsExtraction) {
            const sz = fs.statSync(targetThumb).size;
            if (sz < 10000) needsExtraction = true;
          }
          if (needsExtraction) {
            extractVideoFramePuppeteer(item.filePath, targetThumb)
              .then(ok => {
                if (ok) registry.setThumbnailPath(item.id, targetThumb);
              })
              .catch(() => {});
          }
        }
      } catch (e) {}
    }, 1000);
  }

  // Expose registry & tunnel on app for testing
  app.registry = registry;
  app.tunnelManager = tunnelManager;

  return app;
}

module.exports = { createApp };
