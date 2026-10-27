import { Admin } from '../models/index.js';
import { SESSION_COOKIE, sha256, verifySession } from '../lib/tokens.js';
import { env } from '../config/env.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Every admin endpoint goes through this: valid session, admin still exists, token not revoked, CSRF + Origin for mutations. */
export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    let payload;
    try {
      payload = verifySession(token);
    } catch {
      return res.status(401).json({ error: 'Session expired' });
    }

    const admin = await Admin.findById(payload.sub).select('-passwordHash');
    if (!admin || admin.tokenVersion !== payload.tv) return res.status(401).json({ error: 'Session no longer valid' });

    if (!SAFE.has(req.method)) {
      const header = req.get('x-csrf-token');
      if (!header || sha256(header) !== payload.csrf) return res.status(403).json({ error: 'Invalid CSRF token' });
      const origin = req.get('origin');
      if (origin && !env.clientOrigins.includes(origin.replace(/\/$/, ''))) {
        return res.status(403).json({ error: 'Origin not allowed' });
      }
    }
    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}
