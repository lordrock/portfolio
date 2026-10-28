import { createClient } from 'redis';
import { env } from '../config/env.js';

export const redisClient = env.REDIS_URL
  ? createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 5_000,
        reconnectStrategy: (retries) => Math.min(250 * (2 ** Math.min(retries, 5)), 5_000),
      },
    })
  : null;

let connecting = false;
let lastError = '';
let reconnectLogged = false;

if (redisClient) {
  redisClient.on('ready', () => {
    lastError = '';
    reconnectLogged = false;
    console.log('[redis] connected');
  });
  redisClient.on('reconnecting', () => {
    if (!reconnectLogged) console.warn('[redis] reconnecting in the background');
    reconnectLogged = true;
  });
  redisClient.on('error', (error) => {
    const message = error?.message || 'Unknown Redis error';
    if (message !== lastError) console.error(`[redis] ${message}; using memory fallback until Redis recovers`);
    lastError = message;
  });
}

export function connectRedis() {
  if (!redisClient || redisClient.isOpen || connecting) return;
  connecting = true;
  redisClient.connect().catch(() => {}).finally(() => { connecting = false; });
}

export async function disconnectRedis() {
  if (redisClient?.isOpen) await redisClient.close();
}

export function getRedisClient() {
  return redisClient?.isReady ? redisClient : null;
}

export function redisStatus() {
  if (!redisClient) return 'not-configured';
  if (redisClient.isReady) return 'connected';
  return redisClient.isOpen ? 'connecting' : 'disconnected';
}
