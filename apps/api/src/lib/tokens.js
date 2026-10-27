import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'pf_session';
export const CSRF_COOKIE = 'pf_csrf';
const SESSION_HOURS = 8;

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function signSession(admin, csrfToken) {
  return jwt.sign(
    { sub: String(admin._id), tv: admin.tokenVersion, csrf: sha256(csrfToken), kind: 'session' },
    env.JWT_SECRET,
    { expiresIn: `${SESSION_HOURS}h`, issuer: 'portfolio-api' }
  );
}

export function verifySession(token) {
  const p = jwt.verify(token, env.JWT_SECRET, { issuer: 'portfolio-api' });
  if (p.kind !== 'session') throw new Error('wrong token kind');
  return p;
}

/** Short-lived token that lets the owner view an unpublished work through the public site. */
export function signPreview(workId) {
  return jwt.sign({ sub: String(workId), kind: 'preview' }, env.JWT_SECRET, { expiresIn: '30m', issuer: 'portfolio-api' });
}
export function verifyPreview(token, workId) {
  try {
    const p = jwt.verify(token, env.JWT_SECRET, { issuer: 'portfolio-api' });
    return p.kind === 'preview' && p.sub === String(workId);
  } catch {
    return false;
  }
}

export function cookieOptions(extra = {}) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    maxAge: SESSION_HOURS * 3600 * 1000,
    ...extra,
  };
}

export const newCsrfToken = () => crypto.randomBytes(24).toString('hex');
