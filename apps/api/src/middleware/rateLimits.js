import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

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

export const globalLimiter = make(60_000, 300, 'Too many requests, slow down.');
export const loginLimiter = make(15 * 60_000, 10, 'Too many login attempts. Try again later.', {
  // Successful owner logins should not consume the brute-force allowance.
  skipSuccessfulRequests: true,
});
export const inquiryLimiter = make(60 * 60_000, 5, 'You have sent several messages recently. Please try again later.');
export const uploadLimiter = make(60_000, 40, 'Too many uploads, slow down.');
