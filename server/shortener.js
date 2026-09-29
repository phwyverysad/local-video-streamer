/**
 * Service to shorten URLs using da.gd API
 */
async function shortenWithDaGd(longUrl, { timeoutMs = 8000 } = {}) {
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

  const endpoint = `https://da.gd/s?url=${encodeURIComponent(longUrl.trim())}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LocalVideoStreamer/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`da.gd responded with status ${response.status}: ${response.statusText}`);
    }

    const shortUrl = (await response.text()).trim();
    if (!shortUrl || !shortUrl.startsWith('http')) {
      throw new Error('da.gd returned an invalid response: ' + shortUrl);
    }

    return shortUrl;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`da.gd request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { shortenWithDaGd };
