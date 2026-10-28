// Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='long-password' npm run admin:create
// Creates (or resets the password of) THE single owner account. There is no public registration endpoint.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { Admin } from '../models/index.js';

const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || '';
const name = process.env.ADMIN_NAME || 'Owner';
const replaceExisting = ['true', '1'].includes((process.env.ADMIN_REPLACE_EXISTING || '').toLowerCase());

if (!email || password.length < 12) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 characters) in apps/api/.env or the shell.');
  process.exit(1);
}
if (!/[a-z]/.test(password) || !/[A-Z0-9\W]/.test(password)) {
  console.error('Use a stronger password: mix lowercase with uppercase letters, numbers or symbols.');
  process.exit(1);
}

await mongoose.connect(env.MONGODB_URI);
const count = await Admin.countDocuments();
let existing = await Admin.findOne({ email });

if (!existing && count > 0) {
  if (!replaceExisting) {
    console.error('An admin already exists under another email. Use that email, or set ADMIN_REPLACE_EXISTING=true once to replace the single owner account.');
    await mongoose.disconnect();
    process.exit(1);
  }
  if (count !== 1) {
    console.error(`Expected one owner account but found ${count}. Refusing to replace accounts automatically.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  existing = await Admin.findOne();
}

const passwordHash = await bcrypt.hash(password, 12);
if (existing) {
  const emailChanged = existing.email !== email;
  existing.email = email;
  existing.name = name;
  existing.passwordHash = passwordHash;
  existing.tokenVersion += 1; // signs out every old session
  existing.failedAttempts = 0;
  existing.lockUntil = undefined;
  await existing.save();
  console.log(`${emailChanged ? 'Admin account replaced' : 'Password reset'} for ${email}. All previous sessions were revoked.`);
} else {
  await Admin.create({ email, name, passwordHash });
  console.log(`Admin created: ${email}`);
}
await mongoose.disconnect();
