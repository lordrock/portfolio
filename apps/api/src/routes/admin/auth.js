import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Admin } from '../../models/index.js';
import { validate } from '../../middleware/validate.js';
import { loginLimiter, loginSharedLimiter } from '../../middleware/rateLimits.js';
import { requireAdmin } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { CSRF_COOKIE, SESSION_COOKIE, cookieOptions, newCsrfToken, signSession } from '../../lib/tokens.js';
import { loginSchema } from '../../schemas/index.js';
import { audit } from '../../lib/audit.js';

const r = Router();
// Used to equalise timing when the email doesn't exist. Keep this precomputed:
// generating a cost-12 hash during every dev/watch startup is unnecessarily slow.
const DUMMY_HASH = '$2a$12$5Zkw7Z28vhEAPYFcsw71ZuHdkcr6oUdsG5NH/HG2CWHDSTVXhfmCS';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

function startSession(res, admin) {
  const csrf = newCsrfToken();
  res.cookie(SESSION_COOKIE, signSession(admin, csrf), cookieOptions());
  // Readable by the admin UI (double-submit); useless without the httpOnly session cookie.
  res.cookie(CSRF_COOKIE, csrf, cookieOptions({ httpOnly: false }));
  return csrf;
}

r.post(
  '/login',
  loginLimiter,
  loginSharedLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    const locked = admin?.lockUntil && admin.lockUntil > new Date();
    const ok = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);

    if (!admin || !ok || locked) {
      if (admin && !locked) {
        admin.failedAttempts += 1;
        if (admin.failedAttempts >= MAX_FAILS) {
          admin.lockUntil = new Date(Date.now() + LOCK_MS);
          admin.failedAttempts = 0;
        }
        await admin.save();
      }
      return res.status(401).json({ error: locked ? 'Account temporarily locked. Try again later.' : 'Invalid email or password' });
    }

    admin.failedAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLoginAt = new Date();
    await admin.save();
    const csrf = startSession(res, admin);
    await audit(req, 'login', 'Admin', admin._id, '');
    res.json({ admin: { id: admin._id, email: admin.email, name: admin.name }, csrfToken: csrf });
  })
);

r.post(
  '/logout',
  asyncHandler(async (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions({ maxAge: undefined }));
    res.clearCookie(CSRF_COOKIE, cookieOptions({ httpOnly: false, maxAge: undefined }));
    res.json({ ok: true });
  })
);

r.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: { id: req.admin._id, email: req.admin.email, name: req.admin.name } });
});

// Invalidate every session for this admin (e.g. lost device).
r.post(
  '/revoke-all',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await Admin.updateOne({ _id: req.admin._id }, { $inc: { tokenVersion: 1 } });
    res.clearCookie(SESSION_COOKIE, cookieOptions({ maxAge: undefined }));
    res.json({ ok: true });
  })
);

export default r;
