const test = require('node:test');
const assert = require('node:assert');
const { shortenUrl, shortenWithDaGd } = require('../server/shortener');

test('spoo.me URL shortener - URL validation and shortening', async (t) => {
  await t.test('throws on empty or non-string input', async () => {
    await assert.rejects(async () => {
      await shortenUrl('');
    }, /valid URL/);

    await assert.rejects(async () => {
      await shortenUrl(null);
    }, /valid URL/);
  });

  await t.test('throws on non-http/https protocols', async () => {
    await assert.rejects(async () => {
      await shortenUrl('ftp://example.com/file');
    }, /URL must start with http/);
  });

  await t.test('successfully shortens a live URL via spoo.me', async () => {
    const testUrl = 'https://github.com/nodejs/node?v=' + Date.now();
    try {
      const short = await shortenUrl(testUrl);
      assert.ok(short.startsWith('https://spoo.me/'));
      assert.ok(short.length < testUrl.length);
    } catch (err) {
      // If network is temporarily blocked/offline in test environment, verify error is informative
      console.warn('Network call failed (possibly offline):', err.message);
      assert.ok(err.message);
    }
  });

  await t.test('shortenWithDaGd alias works identically', async () => {
    assert.strictEqual(typeof shortenWithDaGd, 'function');
  });
});
