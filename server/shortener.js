/**
 * High-Reliability Multi-Provider URL Shortener
 * Automatically cascades through multiple free, keyless shortener APIs:
 * 1. spoo.me (modern v1 API)
 * 2. CleanURI
 * 3. clck.ru
 * 4. TinyURL
 */

async function shortenWithSpooMe(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://spoo.me/api/v1/shorten', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url })
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`spoo.me HTTP ${res.status}: ${errText.slice(0, 100)}`);
    }
    const data = await res.json();
    if (data && data.short_url) {
      return data.short_url.replace(/^http:\/\//i, 'https://');
    }
    throw new Error('spoo.me did not return short_url');
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function shortenWithCleanUri(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://cleanuri.com/api/v1/shorten', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'url=' + encodeURIComponent(url)
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`CleanURI HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.result_url) {
      return data.result_url.replace(/^http:\/\//i, 'https://');
    }
    throw new Error('CleanURI did not return result_url');
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function shortenWithClckRu(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://clck.ru/--?url=' + encodeURIComponent(url), {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`clck.ru HTTP ${res.status}`);
    const text = await res.text();
    const clean = text.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean.replace(/^http:\/\//i, 'https://');
    }
    throw new Error('clck.ru returned invalid URL: ' + clean.slice(0, 50));
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function shortenWithTinyUrl(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url), {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`TinyURL HTTP ${res.status}`);
    const text = await res.text();
    const clean = text.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean.replace(/^http:\/\//i, 'https://');
    }
    throw new Error('TinyURL returned error: ' + clean.slice(0, 50));
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

const PROVIDERS = [
  { name: 'spoo.me', fn: shortenWithSpooMe },
  { name: 'cleanuri', fn: shortenWithCleanUri },
  { name: 'clck.ru', fn: shortenWithClckRu },
  { name: 'tinyurl', fn: shortenWithTinyUrl }
];

async function shortenUrl(longUrl, { timeoutMs = 5000 } = {}) {
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
  const errors = [];

  for (const provider of PROVIDERS) {
    try {
      const short = await provider.fn(cleanLongUrl, timeoutMs);
      if (short && typeof short === 'string' && short.startsWith('http')) {
        return short;
      }
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error(`All URL shortening providers failed: ${errors.join('; ')}`);
}

// Keep shortenWithDaGd as backward compatible alias
const shortenWithDaGd = shortenUrl;

module.exports = { shortenUrl, shortenWithDaGd };
