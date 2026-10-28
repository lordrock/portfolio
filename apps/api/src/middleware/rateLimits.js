import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { getRedisClient } from '../lib/redis.js';

const make = (windowMs, limit, message, options = {}) =>
  rateLimit({
    windowMs,
    limit: env.NODE_ENV === 'test' ? 10_000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
    skip: (req) => req.method === 'OPTIONS',
    ...options,
  });

const passthrough = (req, res, next) => next();
const makeShared = (name, windowMs, limit, message, options = {}) => {
  if (!env.REDIS_URL) return passthrough;
  const sharedLimit = env.NODE_ENV === 'test' ? 10_000 : limit;
  return async (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const redis = getRedisClient();
    if (!redis) return next();

    // Fixed-window keying avoids permanent counters even if Redis disconnects
    // between INCR and PEXPIRE. The local express-rate-limit layer remains the
    // first line of defence while this adds a cross-instance ceiling.
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `portfolio:rate-limit:${name}:${bucket}:${req.ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.pExpire(key, windowMs + 1_000);
      if (count > sharedLimit) return res.status(429).json({ error: message });

      if (options.skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode < 400) redis.decr(key).catch(() => {});
        });
      }
      return next();
    } catch (error) {
      console.error(`[redis] ${name} rate limit failed`, error.message);
      return next();
    }
  };
};

export const globalLimiter = make(60_000, 300, 'Too many requests, slow down.');
export const globalSharedLimiter = makeShared('global', 60_000, 300, 'Too many requests, slow down.');
export const loginLimiter = make(15 * 60_000, 10, 'Too many login attempts. Try again later.', {
  // Successful owner logins should not consume the brute-force allowance.
  skipSuccessfulRequests: true,
});
export const loginSharedLimiter = makeShared('login', 15 * 60_000, 10, 'Too many login attempts. Try again later.', { skipSuccessfulRequests: true });
export const inquiryLimiter = make(60 * 60_000, 5, 'You have sent several messages recently. Please try again later.');
export const inquirySharedLimiter = makeShared('inquiry', 60 * 60_000, 5, 'You have sent several messages recently. Please try again later.');
export const uploadLimiter = make(60_000, 40, 'Too many uploads, slow down.');
export const uploadSharedLimiter = makeShared('upload', 60_000, 40, 'Too many uploads, slow down.');
