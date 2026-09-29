process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const puppeteer = require('puppeteer-core');
const { createApp } = require('../server/app');
const VideoRegistry = require('../server/registry');

// Determine local browser binary
function getBrowserExecutable() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(edgePath)) return edgePath;
  throw new Error('No compatible browser executable found (Chrome or Edge)');
}

test('E2E Web Browser Test - Dashboard, Shortening, Video Player, and Revocation', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-video-test-'));
  const storageFile = path.join(tmpDir, 'shares.json');
  const uploadsDir = path.join(tmpDir, 'uploads');
  const registry = new VideoRegistry({ storageFile });

  const mockTunnel = {
    getStatus: () => ({
      status: 'online',
      publicUrl: 'https://example.com',
      provider: 'cloudflare'
    }),
    start: async () => 'https://example.com',
    stop: () => {}
  };

  const app = createApp({
    uploadsDir,
    storageFile,
    registry,
    tunnelManager: mockTunnel
  });

  const PORT = 3456;
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  const sampleVideoFile = path.join(tmpDir, 'trailer_clip.mp4');
  fs.writeFileSync(sampleVideoFile, Buffer.alloc(2048, 0));

  const browserPath = getBrowserExecutable();
  console.log('Launching browser for E2E testing:', browserPath);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    protocolTimeout: 30000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const friendPage = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  try {
    // 1. Visit Dashboard
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    assert.ok(title.includes('แสดงตัวอย่างวิดีโอ'));

    const dropzoneText = await page.$eval('.dropzone-text', el => el.textContent);
    assert.ok(dropzoneText.includes('ลากไฟล์วิดีโอ'));

    // 2. Add video via path
    await page.type('#local-path-input', sampleVideoFile);
    await page.click('#btn-add-path');
    await page.waitForSelector('.share-item', { timeout: 5000 });

    const cardTitle = await page.$eval('.video-info h3', el => el.textContent);
    assert.strictEqual(cardTitle, 'trailer_clip.mp4');

    const urlInput = await page.$eval('.link-input', el => el.value);
    const parts = urlInput.split('/v/');
    const shareId = parts[1].replace('.mp4', '');
    assert.ok(shareId);

    // 2b. Add video via file input
    const uploadSample = path.join(tmpDir, 'uploaded_fun.mp4');
    fs.writeFileSync(uploadSample, Buffer.alloc(1024, 1));
    const fileInput = await page.$('#file-input');
    await fileInput.uploadFile(uploadSample);
    await page.waitForFunction(
      () => document.querySelectorAll('.share-item').length >= 2,
      { timeout: 8000 }
    );

    // 2c. Open & close modal
    const playBtn = await page.$(`#share-card-${shareId} .btn-play`);
    assert.ok(playBtn);
    await playBtn.click();
    await page.waitForSelector('#video-modal', { visible: true, timeout: 5000 });
    await page.click('.modal-close-btn');
    await page.waitForSelector('#video-modal', { hidden: true, timeout: 3000 });

    // 3. Shorten link
    const shortenBtn = await page.waitForSelector(`#btn-shorten-${shareId}`, { visible: true, timeout: 5000 });
    await shortenBtn.click();
    await page.waitForFunction(
      (id) => {
        const input = document.getElementById(`url-input-${id}`);
        return input && (input.value.startsWith('http://') || input.value.startsWith('https://')) && !input.value.includes('/v/v_');
      },
      { timeout: 10000 },
      shareId
    );

    // 4. Friend opens video
    const response = await friendPage.goto(`http://127.0.0.1:${PORT}/v/${shareId}.mp4`);
    assert.strictEqual(response.status(), 200);
    assert.strictEqual(response.headers()['content-type'], 'video/mp4');

    // 5. Delete and verify revocation
    await friendPage.goto('about:blank');
    await page.bringToFront();
    await page.evaluate(() => { window.confirm = () => true; });
    const deleteBtn = await page.$(`#share-card-${shareId} .btn-danger`);
    assert.ok(deleteBtn);
    await deleteBtn.click();

    await page.waitForFunction(
      (id) => !document.getElementById(`share-card-${id}`),
      { timeout: 5000 },
      shareId
    );

    const directRes = await friendPage.goto(`http://127.0.0.1:${PORT}/v/${shareId}.mp4`);
    assert.strictEqual(directRes.status(), 404);

  } finally {
    if (server && typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
    if (browser) {
      try {
        const proc = browser.process();
        await browser.close();
        if (proc && !proc.killed) proc.kill('SIGKILL');
      } catch (e) {}
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
});
