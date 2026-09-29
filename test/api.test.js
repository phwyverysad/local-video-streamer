process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');
const { createApp } = require('../server/app');
const VideoRegistry = require('../server/registry');

test('API Integration Tests', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-'));
  const storageFile = path.join(tmpDir, 'shares.json');
  const uploadsDir = path.join(tmpDir, 'uploads');
  const registry = new VideoRegistry({ storageFile });

  const mockTunnelManager = {
    getStatus: () => ({
      status: 'online',
      publicUrl: 'https://test-tunnel.trycloudflare.com',
      provider: 'cloudflare'
    }),
    start: async () => 'https://test-tunnel.trycloudflare.com',
    stop: () => {}
  };

  const app = createApp({
    uploadsDir,
    storageFile,
    registry,
    tunnelManager: mockTunnelManager
  });

  // Sample video file for local testing
  const sampleLocalVideo = path.join(tmpDir, 'sample_clip.mp4');
  fs.writeFileSync(sampleLocalVideo, Buffer.alloc(1024, 'X')); // 1KB dummy mp4

  let uploadedShareId = null;
  let localShareId = null;

  await t.test('GET /api/status returns server and tunnel status', async () => {
    const res = await request(app).get('/api/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.server, 'running');
    assert.strictEqual(res.body.tunnel.publicUrl, 'https://test-tunnel.trycloudflare.com');
  });

  await t.test('POST /api/shares/upload uploads video and registers share', async () => {
    const dummyUploadFile = path.join(tmpDir, 'upload_me.mp4');
    fs.writeFileSync(dummyUploadFile, Buffer.alloc(512, 'Y'));

    const res = await request(app)
      .post('/api/shares/upload')
      .attach('video', dummyUploadFile);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.success);
    assert.ok(res.body.share.id);
    assert.strictEqual(res.body.share.originalName, 'upload_me.mp4');
    assert.strictEqual(res.body.share.publicUrl, `https://test-tunnel.trycloudflare.com/v/${res.body.share.id}`);

    uploadedShareId = res.body.share.id;
  });

  await t.test('POST /api/shares/local registers local path directly', async () => {
    const res = await request(app)
      .post('/api/shares/local')
      .send({ filePath: sampleLocalVideo });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.success);
    assert.ok(res.body.share.id);
    assert.strictEqual(res.body.share.originalName, 'sample_clip.mp4');
    assert.strictEqual(res.body.share.size, 1024);

    localShareId = res.body.share.id;
  });

  await t.test('GET /api/shares returns active shares list', async () => {
    const res = await request(app).get('/api/shares');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.shares.length, 2);
  });

  await t.test('GET /api/video-info/:id returns video metadata', async () => {
    const res = await request(app).get(`/api/video-info/${localShareId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.isAvailable, true);
    assert.strictEqual(res.body.originalName, 'sample_clip.mp4');
    assert.strictEqual(res.body.size, 1024);
  });

  await t.test('GET /api/stream/:id streams video with Range headers', async () => {
    const res = await request(app)
      .get(`/api/stream/${localShareId}`)
      .set('Range', 'bytes=0-99');

    assert.strictEqual(res.status, 206);
    assert.strictEqual(res.headers['content-range'], 'bytes 0-99/1024');
    assert.strictEqual(res.headers['content-length'], '100');
  });

  await t.test('POST /api/shares/:id/shorten shortens URL via spoo.me', async () => {
    const res = await request(app)
      .post(`/api/shares/${localShareId}/shorten`)
      .send({ baseUrl: 'https://example.com' });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.shortUrl);
    assert.ok(res.body.shortUrl.startsWith('http'));
  });

  await t.test('GET /api/thumbnail/:id returns fallback SVG poster if no image uploaded', async () => {
    const res = await request(app).get(`/api/thumbnail/${localShareId}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.header['content-type'].includes('image/svg+xml'));
    const bodyStr = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.body));
    assert.ok(bodyStr.includes('<svg'));
    assert.ok(bodyStr.includes('sample_clip.mp4'));
  });

  await t.test('POST /api/shares/:id/thumbnail uploads JPEG cover and serves it as image/jpeg', async () => {
    // 1x1 dummy jpeg base64
    const dummyJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const postRes = await request(app)
      .post(`/api/shares/${localShareId}/thumbnail`)
      .send({ dataUrl: dummyJpeg });

    assert.strictEqual(postRes.status, 200);
    assert.strictEqual(postRes.body.success, true);

    const getRes = await request(app).get(`/api/thumbnail/${localShareId}.jpg`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.header['content-type'], 'image/jpeg');
  });

  await t.test('GET /api/oembed returns valid oEmbed video schema', async () => {
    const res = await request(app).get(`/api/oembed?url=https://test-tunnel.trycloudflare.com/v/${localShareId}&format=json`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.type, 'video');
    assert.strictEqual(res.body.title, 'sample_clip.mp4');
    assert.ok(res.body.thumbnail_url.includes('/api/thumbnail/'));
  });

  await t.test('GET /v/:id injects rich Open Graph and Twitter video tags', async () => {
    const res = await request(app).get(`/v/${localShareId}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.text.includes('og:video'));
    assert.ok(res.text.includes('og:image'));
    assert.ok(res.text.includes('twitter:card'));
    assert.ok(res.text.includes('sample_clip.mp4'));
  });

  await t.test('GET /v/:id.mp4 streams video directly with inline disposition', async () => {
    const res = await request(app).get(`/v/${localShareId}.mp4`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'video/mp4');
    assert.ok(res.headers['content-disposition'].includes('inline'));
  });

  await t.test('DELETE /api/shares/:id revokes share immediately', async () => {
    const res = await request(app).delete(`/api/shares/${localShareId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify video-info returns 404 / unavailable
    const infoRes = await request(app).get(`/api/video-info/${localShareId}`);
    assert.strictEqual(infoRes.status, 404);
    assert.strictEqual(infoRes.body.isAvailable, false);

    // Verify stream returns 404
    const streamRes = await request(app).get(`/api/stream/${localShareId}`);
    assert.strictEqual(streamRes.status, 404);
  });

  await t.test('DELETE /api/shares/:id on uploaded video removes physical file', async () => {
    const share = registry.get(uploadedShareId);
    assert.ok(share);
    const filePath = share.filePath;
    assert.strictEqual(fs.existsSync(filePath), true);

    const res = await request(app).delete(`/api/shares/${uploadedShareId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(fs.existsSync(filePath), false);
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
