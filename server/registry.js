const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class VideoRegistry {
  constructor(options = {}) {
    this.storageFile = options.storageFile || path.join(__dirname, '..', 'data', 'shares.json');
    this.shares = new Map();
    this.initStorage();
  }

  initStorage() {
    this.reloadFromDisk();
  }

  reloadFromDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (fs.existsSync(item.filePath)) {
              this.shares.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[VideoRegistry] Failed to load stored shares, starting fresh:', err.message);
      if (!this.shares) this.shares = new Map();
    }
  }

  save() {
    try {
      const list = Array.from(this.shares.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('[VideoRegistry] Failed to save shares:', err.message);
    }
  }

  register({ filePath, originalName, size, mimeType, isUploaded = false }) {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Video file does not exist on disk: ' + filePath);
    }

    const stat = fs.statSync(filePath);
    const resolvedSize = size || stat.size;
    const resolvedName = originalName || path.basename(filePath);
    const id = 'v_' + crypto.randomBytes(6).toString('hex');

    const share = {
      id,
      filePath: path.resolve(filePath),
      originalName: resolvedName,
      size: resolvedSize,
      mimeType: mimeType || this.detectMimeType(resolvedName),
      isUploaded: Boolean(isUploaded),
      createdAt: new Date().toISOString(),
      shortUrl: null,
      views: 0
    };

    this.shares.set(id, share);
    this.save();
    return share;
  }

  get(id) {
    if (!id) return null;
    
    // Always check memory first, then reload from disk if missing
    if (!this.shares.has(id)) {
      this.reloadFromDisk();
    }
    if (!this.shares.has(id)) {
      return null;
    }
    const share = this.shares.get(id);
    if (!fs.existsSync(share.filePath)) {
      this.revoke(id, false);
      return null;
    }
    return share;
  }

  list() {
    this.reloadFromDisk();
    const valid = [];
    for (const [id, item] of this.shares.entries()) {
      if (fs.existsSync(item.filePath)) {
        valid.push({ ...item });
      } else {
        this.shares.delete(id);
      }
    }
    return valid;
  }

  revoke(id, deletePhysicalFile = false) {
    if (!this.shares.has(id)) {
      this.reloadFromDisk();
    }
    if (!this.shares.has(id)) {
      return false;
    }
    const item = this.shares.get(id);
    this.shares.delete(id);
    this.save();

    if (item.thumbnailPath && fs.existsSync(item.thumbnailPath)) {
      try {
        fs.unlinkSync(item.thumbnailPath);
      } catch (err) {}
    }

    if ((deletePhysicalFile || item.isUploaded) && fs.existsSync(item.filePath)) {
      try {
        fs.unlinkSync(item.filePath);
      } catch (err) {
        console.warn(`[VideoRegistry] Error deleting file ${item.filePath}:`, err.message);
      }
    }
    return true;
  }

  setThumbnailPath(id, thumbnailPath) {
    const item = this.get(id);
    if (!item) return null;
    item.thumbnailPath = thumbnailPath;
    this.save();
    return item;
  }

  setShortUrl(id, shortUrl) {
    const item = this.get(id);
    if (!item) return null;
    item.shortUrl = shortUrl;
    this.save();
    return item;
  }

  incrementViews(id) {
    const item = this.get(id);
    if (!item) return;
    item.views = (item.views || 0) + 1;
    this.save();
  }

  detectMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.mp4': return 'video/mp4';
      case '.webm': return 'video/webm';
      case '.mov': return 'video/quicktime';
      case '.mkv': return 'video/x-matroska';
      case '.avi': return 'video/x-msvideo';
      case '.m4v': return 'video/mp4';
      default: return 'video/mp4';
    }
  }
}

module.exports = VideoRegistry;
