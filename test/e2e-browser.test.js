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

test('E2E Web Browser Test - Dashboard, da.gd Shortening, Video Player, and Revocation', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-video-test-'));
  const storageFile = path.join(tmpDir, 'shares.json');
  const uploadsDir = path.join(tmpDir, 'uploads');
  const registry = new VideoRegistry({ storageFile });

  // Mock tunnel manager for predictable testing (using loca.lt domain which da.gd supports)
  const mockTunnel = {
    getStatus: () => ({
      status: 'online',
      publicUrl: 'https://sample-test-share.loca.lt',
      provider: 'localtunnel'
    }),
    start: async () => 'https://sample-test-share.loca.lt',
    stop: () => {}
  };

  const app = createApp({
    uploadsDir,
    storageFile,
    registry,
    tunnelManager: mockTunnel
  });

  // Start test server on port 3456
  const PORT = 3456;
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  // Create a sample test video file
  const sampleVideoFile = path.join(tmpDir, 'trailer_clip.mp4');
  fs.writeFileSync(sampleVideoFile, Buffer.alloc(2048, 0));

  const browserPath = getBrowserExecutable();
  console.log('Launching browser for E2E testing:', browserPath);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Automatically accept confirmation dialogs (for delete confirmation)
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  try {
    // 1. Visit Dashboard
    await t.test('1. Load Dashboard UI', async () => {
      await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });
      const title = await page.title();
      assert.ok(title.includes('Local Video Streamer'));

      const heading = await page.$eval('h1', el => el.textContent);
      assert.strictEqual(heading, 'Local Video Streamer');

      const tunnelBadge = await page.$eval('#tunnel-badge', el => el.textContent);
      assert.ok(tunnelBadge.includes('ออนไลน์'));
    });

    // 2. Share a video via local path
    let shareId = null;
    await t.test('2. Add video file and generate share link via path', async () => {
      await page.type('#local-path-input', sampleVideoFile);
      await page.click('#btn-add-path');

      // Wait for share card to render
      await page.waitForSelector('.share-item', { timeout: 5000 });
      const cardTitle = await page.$eval('.video-info h3', el => el.textContent);
      assert.strictEqual(cardTitle, 'trailer_clip.mp4');

      const urlInput = await page.$eval('.link-input', el => el.value);
      assert.ok(urlInput.includes('/v/v_'));

      // Extract share ID
      const parts = urlInput.split('/v/');
      shareId = parts[1];
      assert.ok(shareId);
    });

    await t.test('2b. Upload video via file input', async () => {
      const uploadSample = path.join(tmpDir, 'uploaded_fun.mp4');
      fs.writeFileSync(uploadSample, Buffer.alloc(1024, 1));

      const fileInput = await page.$('#file-input');
      await fileInput.uploadFile(uploadSample);

      // Wait for second share item to appear
      await page.waitForFunction(
        () => document.querySelectorAll('.share-item').length >= 2,
        { timeout: 8000 }
      );

      const count = await page.$eval('#shares-count', el => el.textContent);
      assert.strictEqual(count, '2 รายการ');
    });

    // 3. Click Shorten Link (da.gd) button
    await t.test('3. Shorten link with da.gd button', async () => {
      const shortenBtn = await page.$(`#btn-shorten-${shareId}`);
      assert.ok(shortenBtn, 'Shorten button must exist');

      await shortenBtn.click();

      // Wait for button state to update or input to have da.gd link
      await page.waitForFunction(
        (id) => {
          const input = document.getElementById(`url-input-${id}`);
          return input && input.value.startsWith('https://da.gd/');
        },
        { timeout: 10000 },
        shareId
      );

      const shortenedVal = await page.$eval(`#url-input-${shareId}`, el => el.value);
      console.log('E2E Generated da.gd URL:', shortenedVal);
      assert.ok(shortenedVal.startsWith('https://da.gd/'));

      const btnText = await page.$eval(`#btn-shorten-${shareId}`, el => el.textContent);
      assert.ok(btnText.includes('ย่อแล้ว') || btnText.includes('da.gd'));
    });

    // 4. Friend opens the video player page
    const friendPage = await browser.newPage();
    await t.test('4. Friend opens video player page', async () => {
      await friendPage.goto(`http://localhost:${PORT}/v/${shareId}`, { waitUntil: 'networkidle0' });

      // Wait for player to become active
      await friendPage.waitForSelector('#player-active', { visible: true, timeout: 5000 });

      const videoTitle = await friendPage.$eval('#video-title', el => el.textContent);
      assert.strictEqual(videoTitle, 'trailer_clip.mp4');

      const videoSrc = await friendPage.$eval('#video-source', el => el.getAttribute('src'));
      assert.strictEqual(videoSrc, `/api/stream/${shareId}`);
    });

    // 5. Delete/Revoke video from Dashboard and verify friend page gets revoked
    await t.test('5. Delete video and verify instant revocation', async () => {
      // Bring dashboard to front and click delete on the specific share
      await page.bringToFront();
      const deleteBtn = await page.$(`#share-card-${shareId} .btn-danger`);
      assert.ok(deleteBtn, 'Delete button for shared video must exist');
      await deleteBtn.click();

      // Wait for that share card to disappear
      await page.waitForFunction(
        (id) => !document.getElementById(`share-card-${id}`),
        { timeout: 5000 },
        shareId
      );

      // Verify shares count decreased to 1
      const count = await page.$eval('#shares-count', el => el.textContent);
      assert.strictEqual(count, '1 รายการ');

      // Now friend tries to refresh the player page
      await friendPage.bringToFront();
      await friendPage.reload({ waitUntil: 'networkidle0' });

      // Wait for revoked box to appear
      await friendPage.waitForSelector('#player-revoked', { visible: true, timeout: 5000 });
      const revokedTitle = await friendPage.$eval('.revoked-title', el => el.textContent);
      assert.ok(revokedTitle.includes('ไม่สามารถรับชมได้แล้ว'));
    });

    await friendPage.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
