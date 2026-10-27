import mongoose from 'mongoose';
import { env } from './config/env.js';
import { createApp } from './app.js';

mongoose.set('strictQuery', true);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let shuttingDown = false;

function connectionHint(err) {
  if (['querySrv', 'queryTxt'].includes(err?.syscall) || ['ESERVFAIL', 'ETIMEOUT'].includes(err?.code)) {
    return 'Atlas DNS lookup failed. Check DNS/VPN/firewall, or use the standard mongodb:// Atlas connection string.';
  }
  return err?.message || 'Unknown database connection error';
}

async function connectDatabase() {
  let delay = env.MONGODB_RETRY_MIN_MS;
  while (!shuttingDown && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS });
      console.log('[db] connected');
      return;
    } catch (err) {
      console.error(`[db] connection failed: ${connectionHint(err)}`);
      console.log(`[db] retrying in ${Math.round(delay / 1000)}s`);
      await wait(delay);
      delay = Math.min(delay * 2, env.MONGODB_RETRY_MAX_MS);
    }
  }
}

async function main() {
  const app = createApp();
  const server = app.listen(env.PORT, () => console.log(`[api] listening on http://localhost:${env.PORT}/api/v1  (${env.NODE_ENV})`));

  mongoose.connection.on('disconnected', () => {
    if (!shuttingDown) console.warn('[db] disconnected; the MongoDB driver will try to recover the connection');
  });
  mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));

  // Do not make HTTP availability depend on a single DNS/network attempt.
  connectDatabase();

  const shutdown = async (sig) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] ${sig} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[api] failed to start', err.message);
  process.exit(1);
});
