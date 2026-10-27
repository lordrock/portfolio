import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import { clearPublicCache, publicResponseCache } from '../src/middleware/responseCache.js';

function makeApp() {
  const app = express();
  let calls = 0;

  app.use(publicResponseCache);
  app.get('/api/v1/public/example', (_req, res) => {
    calls += 1;
    res.json({ calls });
  });
  app.get('/api/v1/public/resume', (_req, res) => {
    calls += 1;
    res.json({ calls });
  });

  return { app, getCalls: () => calls };
}

test.beforeEach(() => clearPublicCache());

test('public JSON responses are served from memory after the first request', async () => {
  const { app, getCalls } = makeApp();

  const first = await request(app).get('/api/v1/public/example');
  const second = await request(app).get('/api/v1/public/example');

  assert.equal(first.status, 200);
  assert.equal(first.headers['x-cache'], 'MISS');
  assert.match(first.headers['cache-control'], /s-maxage=30/);
  assert.equal(second.headers['x-cache'], 'HIT');
  assert.match(second.headers['cache-control'], /s-maxage=30/);
  assert.deepEqual(second.body, first.body);
  assert.equal(getCalls(), 1);
});

test('preview and resume requests always bypass the response cache', async () => {
  const { app, getCalls } = makeApp();

  await request(app).get('/api/v1/public/example?preview=token');
  await request(app).get('/api/v1/public/example?preview=token');
  await request(app).get('/api/v1/public/resume');
  await request(app).get('/api/v1/public/resume');

  assert.equal(getCalls(), 4);
});

test('clearing the cache makes the next public request fresh', async () => {
  const { app, getCalls } = makeApp();

  await request(app).get('/api/v1/public/example');
  await request(app).get('/api/v1/public/example');
  clearPublicCache();
  const fresh = await request(app).get('/api/v1/public/example');

  assert.equal(fresh.headers['x-cache'], 'MISS');
  assert.equal(getCalls(), 2);
});
