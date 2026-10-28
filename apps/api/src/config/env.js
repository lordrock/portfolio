import 'dotenv/config';
import crypto from 'node:crypto';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/portfolio'),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  MONGODB_RETRY_MIN_MS: z.coerce.number().int().min(1000).default(3000),
  MONGODB_RETRY_MAX_MS: z.coerce.number().int().min(1000).default(30000),
  PUBLIC_CACHE_TTL_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
  PUBLIC_CACHE_MAX_ENTRIES: z.coerce.number().int().min(10).max(5000).default(250),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  CLIENT_ORIGINS: z.string().default('http://localhost:3000'),
  PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),
  TRUST_PROXY: bool,
  COOKIE_SECURE: bool,
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('portfolio'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('Portfolio <onboarding@resend.dev>'),
  OWNER_EMAIL: z.string().optional(),
  MAX_IMAGE_MB: z.coerce.number().default(8),
  MAX_DOC_MB: z.coerce.number().default(10),
  UPLOAD_DIR: z.string().default('uploads'),
  REVALIDATE_URL: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const e = parsed.data;
const isProd = e.NODE_ENV === 'production';

// Some Windows/network DNS configurations resolve ordinary hostnames but block
// the SRV/TXT lookups required by mongodb+srv. Convert this project's known
// Atlas seed address to the equivalent standard URI so the driver can use the
// operating system's normal hostname resolver. Credentials remain in .env.
function normalizeMongoUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri;

  const parsedUri = new URL(uri);
  if (parsedUri.hostname !== 'rockportfolio.eelmsig.mongodb.net') return uri;

  const hosts = [
    'ac-1kzszjk-shard-00-00.eelmsig.mongodb.net:27017',
    'ac-1kzszjk-shard-00-01.eelmsig.mongodb.net:27017',
    'ac-1kzszjk-shard-00-02.eelmsig.mongodb.net:27017',
  ];
  const database = parsedUri.pathname && parsedUri.pathname !== '/' ? parsedUri.pathname : '/portfolio';
  const params = new URLSearchParams(parsedUri.search);
  params.set('tls', 'true');
  params.set('authSource', 'admin');
  params.set('replicaSet', 'atlas-r149l2-shard-0');

  return `mongodb://${parsedUri.username}:${parsedUri.password}@${hosts.join(',')}${database}?${params}`;
}

let jwtSecret = e.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('change-me')) {
  if (isProd) {
    console.error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
    process.exit(1);
  }
  jwtSecret = crypto.randomBytes(48).toString('hex');
  if (e.NODE_ENV !== 'test') {
    console.warn('[env] JWT_SECRET missing/weak — using a random one for this process (sessions reset on restart).');
  }
}

if (e.COOKIE_SAMESITE === 'none' && !e.COOKIE_SECURE) {
  console.error('COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
  process.exit(1);
}

export const env = {
  ...e,
  isProd,
  MONGODB_URI: normalizeMongoUri(e.MONGODB_URI),
  JWT_SECRET: jwtSecret,
  clientOrigins: e.CLIENT_ORIGINS.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
  publicSiteUrl: e.PUBLIC_SITE_URL.replace(/\/$/, ''),
  cloudinaryEnabled: Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET),
  emailEnabled: Boolean(e.RESEND_API_KEY),
};
