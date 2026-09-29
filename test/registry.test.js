const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const VideoRegistry = require('../server/registry');

test('VideoRegistry - registering, getting, and revoking shares', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vshare-test-'));
  const testStorage = path.join(tmpDir, 'shares.json');
  const testVideo = path.join(tmpDir, 'sample.mp4');
  fs.writeFileSync(testVideo, 'fake-video-content-12345');

  const registry = new VideoRegistry({ storageFile: testStorage });

  await t.test('should register a valid video', () => {
    const share = registry.register({
      filePath: testVideo,
      originalName: 'my_clip.mp4'
    });

    assert.ok(share.id.startsWith('v_'));
    assert.strictEqual(share.originalName, 'my_clip.mp4');
    assert.strictEqual(share.mimeType, 'video/mp4');
    assert.strictEqual(share.size, fs.statSync(testVideo).size);
  });

  await t.test('should retrieve registered share by ID', () => {
    const list = registry.list();
    assert.strictEqual(list.length, 1);
    const item = registry.get(list[0].id);
    assert.ok(item);
    assert.strictEqual(item.originalName, 'my_clip.mp4');
  });

  await t.test('should update shortUrl', () => {
    const list = registry.list();
    const id = list[0].id;
    registry.setShortUrl(id, 'https://da.gd/sample');
    const updated = registry.get(id);
    assert.strictEqual(updated.shortUrl, 'https://da.gd/sample');
  });

  await t.test('should increment views', () => {
    const list = registry.list();
    const id = list[0].id;
    registry.incrementViews(id);
    registry.incrementViews(id);
    const updated = registry.get(id);
    assert.strictEqual(updated.views, 2);
  });

  await t.test('should revoke share immediately', () => {
    const list = registry.list();
    const id = list[0].id;
    const revoked = registry.revoke(id, false);
    assert.strictEqual(revoked, true);
    assert.strictEqual(registry.get(id), null);
    assert.strictEqual(registry.list().length, 0);
  });

  await t.test('revoking uploaded file should delete physical file', () => {
    const uploadedFile = path.join(tmpDir, 'uploaded.mp4');
    fs.writeFileSync(uploadedFile, 'upload-temp-bytes');
    const share = registry.register({
      filePath: uploadedFile,
      originalName: 'uploaded.mp4',
      isUploaded: true
    });

    assert.ok(fs.existsSync(uploadedFile));
    registry.revoke(share.id, true);
    assert.strictEqual(fs.existsSync(uploadedFile), false);
    assert.strictEqual(registry.get(share.id), null);
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
