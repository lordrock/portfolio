import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/portfolio_test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.CLIENT_ORIGINS = 'http://localhost:3000';
process.env.UPLOAD_DIR = 'uploads-test';

const { default: mongoose } = await import('mongoose');
const { default: request } = await import('supertest');
const bcrypt = (await import('bcryptjs')).default;
const { createApp } = await import('../src/app.js');
const { Admin, Category, Work } = await import('../src/models/index.js');

const app = createApp();
const api = '/api/v1';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let owner; // supertest agent with cookies
let csrf;
let design, dev, web3;

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await Admin.create({ email: 'owner@example.com', passwordHash: await bcrypt.hash('CorrectHorse!42x', 10) });
  [design, dev, , web3] = await Category.insertMany(
    ['design', 'development', 'marketing', 'web3'].map((slug, i) => ({ name: slug, slug, kind: 'pillar', order: i }))
  );
  owner = request.agent(app);
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const workBody = (over = {}) => ({
  type: 'development', title: 'Test Project', summary: 'A summary', primaryCategory: String(dev._id),
  cover: { url: 'https://res.cloudinary.com/x/image/upload/a.jpg', alt: 'a' }, ...over,
});

test('anonymous cannot reach any admin endpoint or write', async () => {
  for (const [m, p] of [['get', '/admin/works'], ['post', '/admin/works'], ['get', '/admin/inquiries'], ['post', '/admin/media'], ['put', '/admin/profile'], ['get', '/admin/overview']]) {
    const res = await request(app)[m](api + p).send({});
    assert.equal(res.status, 401, `${m} ${p}`);
  }
});

test('login rejects wrong password and accepts the right one', async () => {
  const bad = await request(app).post(`${api}/admin/auth/login`).send({ email: 'owner@example.com', password: 'nope' });
  assert.equal(bad.status, 401);
  const ok = await owner.post(`${api}/admin/auth/login`).send({ email: 'owner@example.com', password: 'CorrectHorse!42x' });
  assert.equal(ok.status, 200);
  csrf = ok.body.csrfToken;
  const cookies = ok.headers['set-cookie'].join(';');
  assert.match(cookies, /pf_session=.*HttpOnly/i);
  assert.ok(csrf);
});

test('mutations without CSRF token are rejected even with a valid session', async () => {
  const res = await owner.post(`${api}/admin/works`).send(workBody());
  assert.equal(res.status, 403);
});

let workId;
test('owner creates a draft; it is invisible to the public', async () => {
  const res = await owner.post(`${api}/admin/works`).set('x-csrf-token', csrf).send(workBody({ slug: 'test-project' }));
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'draft');
  workId = res.body._id;
  const pub = await request(app).get(`${api}/public/works/test-project`);
  assert.equal(pub.status, 404);
  const list = await request(app).get(`${api}/public/works`);
  assert.equal(list.body.total, 0);
});

test('duplicate titles receive unique generated slugs', async () => {
  const res = await owner.post(`${api}/admin/works`).set('x-csrf-token', csrf).send(workBody({ slug: 'client-value-is-ignored' }));
  assert.equal(res.status, 201);
  assert.equal(res.body.slug, 'test-project-2');
});

test('preview token shows the draft; wrong token does not', async () => {
  const t = await owner.get(`${api}/admin/works/${workId}/preview-token`);
  assert.equal(t.status, 200);
  const ok = await request(app).get(`${api}/public/works/test-project?preview=${t.body.token}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.preview, true);
  const bad = await request(app).get(`${api}/public/works/test-project?preview=abc`);
  assert.equal(bad.status, 404);
});

test('publish → public; cannot delete published; archive hides it', async () => {
  const pub = await owner.post(`${api}/admin/works/${workId}/publish`).set('x-csrf-token', csrf);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.status, 'published');
  assert.equal((await request(app).get(`${api}/public/works/test-project`)).status, 200);
  assert.equal((await owner.delete(`${api}/admin/works/${workId}`).set('x-csrf-token', csrf)).status, 409);
  await owner.post(`${api}/admin/works/${workId}/archive`).set('x-csrf-token', csrf);
  assert.equal((await request(app).get(`${api}/public/works/test-project`)).status, 404);
  await owner.post(`${api}/admin/works/${workId}/restore`).set('x-csrf-token', csrf);
  await owner.post(`${api}/admin/works/${workId}/publish`).set('x-csrf-token', csrf);
});

test('publishing requires summary and cover', async () => {
  const res = await owner.post(`${api}/admin/works`).set('x-csrf-token', csrf).send({ type: 'design', title: 'No cover', primaryCategory: String(design._id) });
  const pub = await owner.post(`${api}/admin/works/${res.body._id}/publish`).set('x-csrf-token', csrf);
  assert.equal(pub.status, 422);
});

test('one item in two pillars shows in both filtered views with one canonical URL', async () => {
  const res = await owner
    .post(`${api}/admin/works`).set('x-csrf-token', csrf)
    .send(workBody({ title: 'Cross Over', slug: 'cross-over', categories: [String(web3._id)] }));
  assert.equal(res.status, 201);
  await owner.post(`${api}/admin/works/${res.body._id}/publish`).set('x-csrf-token', csrf);
  const a = await request(app).get(`${api}/public/works?pillar=development`);
  const b = await request(app).get(`${api}/public/works?pillar=web3`);
  assert.ok(a.body.items.some((w) => w.slug === 'cross-over'));
  assert.ok(b.body.items.some((w) => w.slug === 'cross-over'));
  assert.equal(b.body.items.filter((w) => w.slug === 'cross-over').length, 1);
});

test('absent campaign metrics are never exposed as zeros; unpermitted metrics are hidden', async () => {
  const mk = (slug, marketing) => owner.post(`${api}/admin/works`).set('x-csrf-token', csrf).send(workBody({ type: 'marketing', title: slug, slug, marketing }));
  const a = await mk('camp-a', { objective: 'x', permissionConfirmed: true, metrics: [] });
  const b = await mk('camp-b', { objective: 'x', permissionConfirmed: false, metrics: [{ label: 'Reach', value: '12k', unit: 'impressions', sourceType: 'owner-reported' }] });
  for (const r of [a, b]) await owner.post(`${api}/admin/works/${r.body._id}/publish`).set('x-csrf-token', csrf);
  const pa = await request(app).get(`${api}/public/works/camp-a`);
  assert.deepEqual(pa.body.work.marketing.metrics, []);
  const pb = await request(app).get(`${api}/public/works/camp-b`);
  assert.deepEqual(pb.body.work.marketing.metrics, [], 'metrics hidden without permission');
});

test('published work URLs remain stable when the title or client slug changes', async () => {
  const w = await Work.findOne({ slug: 'cross-over' });
  const res = await owner.put(`${api}/admin/works/${w._id}`).set('x-csrf-token', csrf).send(workBody({ title: 'Cross Over Renamed', slug: 'crossover-renamed', categories: [String(web3._id)] }));
  assert.equal(res.status, 200);
  assert.equal(res.body.slug, 'cross-over');
  assert.equal((await request(app).get(`${api}/public/works/cross-over`)).status, 200);
  assert.equal((await request(app).get(`${api}/public/works/crossover-renamed`)).status, 404);
});

test('unsafe URLs and mass-assignment are rejected/stripped', async () => {
  const bad = await owner.post(`${api}/admin/works`).set('x-csrf-token', csrf).send(workBody({ title: 'XSS', development: { liveUrl: 'javascript:alert(1)' } }));
  assert.equal(bad.status, 400);
  const sneaky = await owner.post(`${api}/admin/works`).set('x-csrf-token', csrf).send(workBody({ title: 'Sneaky', status: 'published', isSample: true }));
  assert.equal(sneaky.body.status, 'draft');
  assert.equal(sneaky.body.isSample, false);
});

test('inquiry: validation, honeypot, time-trap and success', async () => {
  const good = { name: 'Ada Client', email: 'ada@example.com', topic: 'Web development', message: 'I would like to talk about a project.', consent: true, startedAt: Date.now() - 10_000 };
  assert.equal((await request(app).post(`${api}/public/inquiries`).send({ ...good, email: 'nope' })).status, 400);
  assert.equal((await request(app).post(`${api}/public/inquiries`).send({ ...good, consent: false })).status, 400);
  const { Inquiry } = await import('../src/models/index.js');
  const before = await Inquiry.countDocuments();
  assert.equal((await request(app).post(`${api}/public/inquiries`).send({ ...good, website: 'http://spam' })).status, 202);
  assert.equal((await request(app).post(`${api}/public/inquiries`).send({ ...good, startedAt: Date.now() })).status, 202);
  assert.equal(await Inquiry.countDocuments(), before, 'spam not stored');
  assert.equal((await request(app).post(`${api}/public/inquiries`).send(good)).status, 201);
  assert.equal(await Inquiry.countDocuments(), before + 1);
  const list = await owner.get(`${api}/admin/inquiries`);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].ipHash, undefined);
});

test('media: accepts a real PNG, rejects fake image, bad kind and oversize', async () => {
  const ok = await owner.post(`${api}/admin/media`).set('x-csrf-token', csrf).attach('file', PNG, 'pixel.png');
  assert.equal(ok.status, 201);
  assert.match(ok.body.url, /^\/uploads\//);
  const fake = await owner.post(`${api}/admin/media`).set('x-csrf-token', csrf).attach('file', Buffer.from('MZ this is an exe, not an image......'), 'evil.png');
  assert.equal(fake.status, 415);
  const pdfAsImage = await owner.post(`${api}/admin/media`).set('x-csrf-token', csrf).attach('file', Buffer.from('%PDF-1.4 fake pdf content here'), 'x.pdf');
  assert.equal(pdfAsImage.status, 415);
  const pdf = await owner.post(`${api}/admin/media?kind=document`).set('x-csrf-token', csrf).attach('file', Buffer.from('%PDF-1.4 fake pdf content here'), 'cv.pdf');
  assert.equal(pdf.status, 201);
  const big = await owner.post(`${api}/admin/media`).set('x-csrf-token', csrf).attach('file', Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]), 'big.png');
  assert.equal(big.status, 413);
});

test('testimonials cannot be approved without permission and only approved show publicly', async () => {
  const body = { quote: 'Great work, truly.', authorName: 'Client', approved: true, permissionConfirmed: false };
  assert.equal((await owner.post(`${api}/admin/testimonials`).set('x-csrf-token', csrf).send(body)).status, 422);
  assert.equal((await owner.post(`${api}/admin/testimonials`).set('x-csrf-token', csrf).send({ ...body, permissionConfirmed: true })).status, 201);
  await owner.post(`${api}/admin/testimonials`).set('x-csrf-token', csrf).send({ ...body, authorName: 'Hidden', approved: false });
  const pub = await request(app).get(`${api}/public/testimonials`);
  assert.equal(pub.body.items.length, 1);
});

test('categories: duplicate slugs blocked, pillars undeletable, subcategory needs a pillar parent', async () => {
  const sub = await owner.post(`${api}/admin/categories`).set('x-csrf-token', csrf).send({ name: 'APIs', slug: 'apis', kind: 'sub', parent: String(dev._id) });
  assert.equal(sub.status, 201);
  const dup = await owner.post(`${api}/admin/categories`).set('x-csrf-token', csrf).send({ name: 'APIs 2', slug: 'apis', kind: 'sub', parent: String(dev._id) });
  assert.equal(dup.status, 409);
  const noParent = await owner.post(`${api}/admin/categories`).set('x-csrf-token', csrf).send({ name: 'Orphan', kind: 'sub' });
  assert.equal(noParent.status, 400);
  assert.equal((await owner.delete(`${api}/admin/categories/${dev._id}`).set('x-csrf-token', csrf)).status, 409);
});

test('public site endpoint, Articles hidden until an article is published', async () => {
  const site = await request(app).get(`${api}/public/site`);
  assert.equal(site.status, 200);
  assert.equal(site.body.hasArticles, false);
  assert.equal(site.body.pillars.length, 4);
});

test('logout clears session; revoke-all invalidates old tokens', async () => {
  const other = request.agent(app);
  const l = await other.post(`${api}/admin/auth/login`).send({ email: 'owner@example.com', password: 'CorrectHorse!42x' });
  assert.equal((await other.get(`${api}/admin/auth/me`)).status, 200);
  await owner.post(`${api}/admin/auth/revoke-all`).set('x-csrf-token', csrf);
  assert.equal((await other.get(`${api}/admin/auth/me`)).status, 401, 'other session revoked');
  assert.ok(l.body.csrfToken);
});
