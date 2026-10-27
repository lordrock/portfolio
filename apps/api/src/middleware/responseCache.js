import { env } from '../config/env.js';

// Small per-process LRU cache for public JSON responses. It protects MongoDB
// from repeated portfolio page reads without ever caching admin/private data.
const entries = new Map();

function cacheKey(req) {
  return `${req.method}:${req.originalUrl}`;
}

function remember(key, value) {
  entries.delete(key);
  entries.set(key, value);
  while (entries.size > env.PUBLIC_CACHE_MAX_ENTRIES) {
    entries.delete(entries.keys().next().value);
  }
}

export function clearPublicCache() {
  entries.clear();
}

export function publicResponseCache(req, res, next) {
  if (
    req.method !== 'GET'
    || !req.path.startsWith('/api/v1/public/')
    || req.path === '/api/v1/public/resume'
    || typeof req.query?.preview === 'string'
  ) return next();

  // Keep downstream browser/CDN behaviour identical on both cache hits and
  // misses. Without setting this here, a cache hit would bypass the public
  // router that normally adds this header.
  res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');

  const key = cacheKey(req);
  const now = Date.now();
  const cached = entries.get(key);
  if (cached && cached.expiresAt > now) {
    // Refresh LRU position and make cache behaviour observable in production.
    entries.delete(key);
    entries.set(key, cached);
    res.set('X-Cache', 'HIT');
    res.set('Age', String(Math.max(0, Math.floor((now - cached.createdAt) / 1000))));
    res.status(cached.status).json(cached.body);
    return;
  }
  if (cached) entries.delete(key);

  res.set('X-Cache', 'MISS');
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      remember(key, {
        body,
        status: res.statusCode,
        createdAt: Date.now(),
        expiresAt: Date.now() + env.PUBLIC_CACHE_TTL_MS,
      });
    }
    return sendJson(body);
  };
  next();
}

export function publicCacheStats() {
  return { entries: entries.size, maxEntries: env.PUBLIC_CACHE_MAX_ENTRIES, ttlMs: env.PUBLIC_CACHE_TTL_MS };
}
