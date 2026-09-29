/**
 * Dedicated URL Shortener module using spoo.me
 */
async function shortenUrl(longUrl, { timeoutMs = 8000 } = {}) {
  if (!longUrl || typeof longUrl !== 'string') {
    throw new Error('A valid URL string is required');
  }

  // Validate URL format
  try {
    const parsed = new URL(longUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL must start with http:// or https://');
    }
  } catch (err) {
    throw new Error('Invalid URL format: ' + err.message);
  }

  const cleanLongUrl = longUrl.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://spoo.me', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'url=' + encodeURIComponent(cleanLongUrl)
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`spoo.me HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.short_url) {
      return data.short_url.replace(/^http:\/\//i, 'https://');
    }
    throw new Error('spoo.me did not return a valid short_url');
  } catch (err) {
    clearTimeout(timer);
    throw new Error('Failed to shorten URL with spoo.me: ' + err.message);
  }
}

// Keep shortenWithDaGd as backward compatible alias
const shortenWithDaGd = shortenUrl;

module.exports = { shortenUrl, shortenWithDaGd };
