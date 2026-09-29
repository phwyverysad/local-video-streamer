const fs = require('fs');

/**
 * Handles HTTP Byte-Range video streaming.
 * Supports smooth seeking and instant playback for large video files.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} filePath
 * @param {string} mimeType
 */
function streamVideo(req, res, filePath, mimeType = 'video/mp4') {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Video file not found on disk' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    // Normal 200 response when client doesn't ask for range
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    };
    res.writeHead(200, head);
    const stream = fs.createReadStream(filePath);
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
      'Accept-Ranges': 'bytes'
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
    'Content-Type': mimeType,
    'Cache-Control': 'no-cache'
  };

  res.writeHead(206, head);
  const stream = fs.createReadStream(filePath, { start, end });
  stream.pipe(res);
  res.on('close', () => {
    stream.destroy();
  });
}

module.exports = { streamVideo };
