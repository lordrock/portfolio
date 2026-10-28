import { env } from '../config/env.js';
import { getRedisClient, redisStatus } from '../lib/redis.js';

// Small per-process LRU cache for public JSON responses. It protects MongoDB
// from repeated portfolio page reads without ever caching admin/private data.
const entries = new Map();
const REDIS_PREFIX = 'portfolio:public-cache:';
const REDIS_INDEX = `${REDIS_PREFIX}keys`;

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

export async function clearPublicCache() {
  entries.clear();
  const redis = getRedisClient();
  if (!redis) return;
  try {
    const keys = await redis.sMembers(REDIS_INDEX);
    if (keys.length) await redis.del(keys);
    await redis.del(REDIS_INDEX);
  } catch (error) {
    console.error('[redis] failed to clear public cache', error.message);
  }
}

export async function publicResponseCache(req, res, next) {
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
  const redisKey = `${REDIS_PREFIX}${key}`;
  const now = Date.now();

  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(redisKey);
      if (raw) {
        const shared = JSON.parse(raw);
        res.set('X-Cache', 'HIT-REDIS');
        res.set('Age', String(Math.max(0, Math.floor((now - shared.createdAt) / 1000))));
        return res.status(shared.status).json(shared.body);
      }
    } catch (error) {
      console.error('[redis] public cache read failed', error.message);
    }
  }

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
      const value = {
        body,
        status: res.statusCode,
        createdAt: Date.now(),
        expiresAt: Date.now() + env.PUBLIC_CACHE_TTL_MS,
      };
      remember(key, value);
      const shared = getRedisClient();
      if (shared) {
        shared.multi()
          .set(redisKey, JSON.stringify(value), { PX: env.PUBLIC_CACHE_TTL_MS })
          .sAdd(REDIS_INDEX, redisKey)
          .exec()
          .catch((error) => console.error('[redis] public cache write failed', error.message));
      }
    }
    return sendJson(body);
  };
  next();
}

export function publicCacheStats() {
  return { backend: redisStatus(), memoryEntries: entries.size, maxEntries: env.PUBLIC_CACHE_MAX_ENTRIES, ttlMs: env.PUBLIC_CACHE_TTL_MS };
}
