const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const puppeteer = require('puppeteer-core');

function getBrowserExecutable() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(edgePath)) return edgePath;
  return null;
}

/**
 * Extract a real, high-quality, non-black video frame from a video file on disk.
 * Uses an ephemeral local HTTP Range server + Headless Chrome / Edge with isolated scratch directory.
 */
async function extractVideoFramePuppeteer(videoFilePath, outputJpgPath) {
  const browserPath = getBrowserExecutable();
  if (!browserPath) {
    return false;
  }

  if (!fs.existsSync(videoFilePath)) {
    return false;
  }

  const stat = fs.statSync(videoFilePath);
  const fileSize = stat.size;
  if (fileSize < 1000) return false;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; background:#000;">
      <video id="v" src="/video.mp4" crossorigin="anonymous" muted playsinline preload="auto"></video>
      <canvas id="c"></canvas>
    </body>
    </html>
  `;

  let server;
  let port;
  try {
    server = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (req.url.startsWith('/video.mp4')) {
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const file = fs.createReadStream(videoFilePath, { start, end });
          file.on('error', () => {
            try { res.end(); } catch (e) {}
          });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*'
          });
          file.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*'
          });
          const file = fs.createReadStream(videoFilePath);
          file.on('error', () => {
            try { res.end(); } catch (e) {}
          });
          file.pipe(res);
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', resolve);
      server.on('error', reject);
    });

    port = server.address().port;
  } catch (err) {
    if (server) server.close();
    return false;
  }

  let browser;
  let tempUserDataDir = null;
  try {
    tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vthumb-p-'));

    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: 'new',
      userDataDir: tempUserDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu-shader-disk-cache',
        '--disable-gpu-program-cache',
        '--disable-features=GpuShaderDiskCache',
        '--disk-cache-size=1',
        '--media-cache-size=1',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-sync',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--log-level=3'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const base64Jpg = await page.evaluate(async () => {
      const v = document.getElementById('v');
      const c = document.getElementById('c');
      const ctx = c.getContext('2d');

      const loaded = await new Promise((resolve) => {
        if (v.readyState >= 1 && v.videoWidth > 0) return resolve(true);
        v.onloadedmetadata = () => resolve(true);
        v.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 2500);
      });

      if (!loaded || !v.videoWidth || !v.videoHeight) {
        return null;
      }

      const duration = v.duration || 10;
      const timestamps = [
        Math.min(1.5, duration * 0.1),
        Math.min(3.0, duration * 0.2),
        Math.min(6.0, duration * 0.35),
        duration * 0.25,
        duration * 0.50,
        duration * 0.75
      ].filter(t => t > 0.2 && t < duration);

      if (timestamps.length === 0) timestamps.push(0.5);

      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 160;
      sampleCanvas.height = 90;
      const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

      let bestDataUrl = null;
      let bestScore = 0;

      for (const t of timestamps) {
        await new Promise((resolve) => {
          v.onseeked = () => resolve();
          v.onerror = () => resolve();
          try { v.currentTime = t; } catch(e) { resolve(); }
          setTimeout(resolve, 1800);
        });

        await new Promise(r => setTimeout(r, 80));

        sampleCtx.drawImage(v, 0, 0, 160, 90);
        const img = sampleCtx.getImageData(0, 0, 160, 90).data;
        let totalLum = 0;
        let nonZero = 0;
        const totalPixels = img.length / 4;

        for (let i = 0; i < img.length; i += 4) {
          const r = img[i], g = img[i+1], b = img[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;
          if (r > 15 || g > 15 || b > 15) nonZero++;
        }

        const avgLum = totalLum / totalPixels;
        const nonZeroRatio = nonZero / totalPixels;

        let varSum = 0;
        for (let i = 0; i < img.length; i += 4) {
          const lum = 0.299 * img[i] + 0.587 * img[i+1] + 0.114 * img[i+2];
          varSum += (lum - avgLum) * (lum - avgLum);
        }
        const stdDev = Math.sqrt(varSum / totalPixels);

        let score = -100;
        if (avgLum >= 12 && nonZeroRatio >= 0.20) {
          score = (100 - Math.abs(avgLum - 100)) + (stdDev * 2) + (nonZeroRatio * 50);
        }

        if (score > bestScore) {
          bestScore = score;
          const w = v.videoWidth || 1280;
          const h = v.videoHeight || 720;
          c.width = Math.min(1280, w);
          c.height = Math.round(c.width * (h / w));
          ctx.drawImage(v, 0, 0, c.width, c.height);
          bestDataUrl = c.toDataURL('image/jpeg', 0.90);
          if (score >= 120) break;
        }
      }

      return bestDataUrl;
    });

    if (base64Jpg) {
      const data = base64Jpg.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length < 10000) {
        return false;
      }
      const dir = path.dirname(outputJpgPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputJpgPath, buffer);
      console.log(`[Thumbnail] Successfully extracted real video frame (${buffer.length} bytes) to: ${outputJpgPath}`);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    if (tempUserDataDir && fs.existsSync(tempUserDataDir)) {
      try { fs.rmSync(tempUserDataDir, { recursive: true, force: true }); } catch (e) {}
    }
    if (server) {
      try { server.close(); } catch (e) {}
    }
  }
}

module.exports = { extractVideoFramePuppeteer };
