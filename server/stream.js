const fs = require('fs');
const path = require('path');

/**
 * Normalizes video mime-type for broadest browser compatibility
 * @param {string} filePath
 * @param {string} [declaredMime]
 * @returns {string}
 */
function getMimeType(filePath, declaredMime) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/mp4'; // Browsers play H.264 MOV seamlessly when served as video/mp4
    case '.mkv':
      return 'video/mp4'; // Matroska container with H.264
    case '.ogv':
      return 'video/ogg';
    default:
      return declaredMime || 'video/mp4';
  }
}

/**
 * Handles HTTP Byte-Range video streaming.
 * Supports HEAD requests, seeking, and instant playback for large video files.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} filePath
 * @param {string} [mimeType]
 */
function streamVideo(req, res, filePath, mimeType) {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Video file not found on disk' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const contentType = getMimeType(filePath, mimeType);
  const range = req.headers.range;

  const filename = path.basename(filePath).replace(/"/g, '');
  const disposition = `inline; filename="${encodeURIComponent(filename)}"`;

  // Handle HEAD requests (pre-flight checks from video players)
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    return res.end();
  }

  if (!range) {
    // Normal 200 response when client doesn't request a range
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    };
    res.writeHead(200, head);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      stream.destroy();
    });
    stream.pipe(res);
    res.on('close', () => stream.destroy());
    return;
  }

  // Parse Range header (e.g. "bytes=0-1024" or "bytes=1024-")
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
    res.status(416).set({
      'Content-Range': `bytes */${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    }).end();
    return;
  }

  // If requested chunk is larger than file size, clamp end to file size - 1
  if (end >= fileSize) {
    end = fileSize - 1;
  }

  const chunkSize = end - start + 1;
  const head = {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': contentType,
    'Content-Disposition': disposition,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  };

  res.writeHead(206, head);
  const stream = fs.createReadStream(filePath, { start, end });
  stream.on('error', (err) => {
    stream.destroy();
  });
  stream.pipe(res);
  res.on('close', () => {
    stream.destroy();
  });
}

module.exports = { streamVideo, getMimeType };
