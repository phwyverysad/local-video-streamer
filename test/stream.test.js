const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const request = require('supertest');
const { streamVideo } = require('../server/stream');

test('streamVideo - HTTP Range streaming', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stream-test-'));
  const dummyFile = path.join(tmpDir, 'test.mp4');
  const buffer = Buffer.alloc(100, 'A'); // 100 bytes of 'A'
  fs.writeFileSync(dummyFile, buffer);

  const app = express();
  app.get('/video', (req, res) => {
    streamVideo(req, res, dummyFile, 'video/mp4');
  });
  app.head('/video', (req, res) => {
    streamVideo(req, res, dummyFile, 'video/mp4');
  });

  await t.test('returns 200 with full content when no Range header', async () => {
    const res = await request(app).get('/video');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['accept-ranges'], 'bytes');
    assert.strictEqual(res.headers['content-type'], 'video/mp4');
    assert.strictEqual(res.headers['content-length'], '100');
    assert.strictEqual(res.body.length, 100);
  });

  await t.test('handles HEAD requests cleanly', async () => {
    const res = await request(app).head('/video');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['accept-ranges'], 'bytes');
    assert.strictEqual(res.headers['content-type'], 'video/mp4');
    assert.strictEqual(res.headers['content-length'], '100');
  });

  await t.test('returns 206 Partial Content with correct Content-Range', async () => {
    const res = await request(app)
      .get('/video')
      .set('Range', 'bytes=0-9');

    assert.strictEqual(res.status, 206);
    assert.strictEqual(res.headers['content-range'], 'bytes 0-9/100');
    assert.strictEqual(res.headers['content-length'], '10');
    assert.strictEqual(res.body.length, 10);
  });

  await t.test('handles open-ended range request (e.g. bytes=50-)', async () => {
    const res = await request(app)
      .get('/video')
      .set('Range', 'bytes=50-');

    assert.strictEqual(res.status, 206);
    assert.strictEqual(res.headers['content-range'], 'bytes 50-99/100');
    assert.strictEqual(res.headers['content-length'], '50');
    assert.strictEqual(res.body.length, 50);
  });

  await t.test('returns 416 Range Not Satisfiable for invalid range', async () => {
    const res = await request(app)
      .get('/video')
      .set('Range', 'bytes=200-300');

    assert.strictEqual(res.status, 416);
    assert.strictEqual(res.headers['content-range'], 'bytes */100');
  });

  await t.test('returns 404 if file does not exist', async () => {
    const app404 = express();
    app404.get('/video-missing', (req, res) => {
      streamVideo(req, res, path.join(tmpDir, 'nonexistent.mp4'));
    });
    const res = await request(app404).get('/video-missing');
    assert.strictEqual(res.status, 404);
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
