/**
 * End to end over real HTTP for the admin Experiences API (/api/admin/experiences): the real routes,
 * controller, service, model, upload middleware, login middleware (real JWTs) and error handler, with a
 * real in-memory MongoDB. Only picture storage (S3) is faked.
 *
 * What matters most:
 *  - only a signed-in admin with two-factor set up can reach any of it;
 *  - every refusal is a clear 4xx with a stable code (never a 500, never a logout);
 *  - nothing an admin cannot fix leaks (no database ids, no stack, no storage detail in production);
 *  - a refused request changes nothing.
 */
const ENV = {
  JWT_SECRET: 'e2e-experience-admin-secret-long-enough-1234567890',
  MAIL_DRIVER: 'log',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn(),
  getS3KeyFromUrl: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const s3 = require('../services/s3.service');
const { User } = require('../models');
const Experience = require('../models/Experience');
const experienceAdminRoutes = require('../routes/experienceAdmin.routes');
const errorHandler = require('../middleware/errorHandler');
const requestId = require('../middleware/requestId');

jest.setTimeout(60000);

const BASE = '/api/admin/experiences';
const V1 = 'https://iframe.mediadelivery.net/embed/660084/video-one';
const V2 = 'https://iframe.mediadelivery.net/embed/660084/video-two';
const UNKNOWN_UUID = '3b241101-e2bb-4255-8caf-4136c566a962';
const GOOD_PASSWORD = 'CorrectHorse42';

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(requestId);
  app.use(express.json());
  app.use(BASE, experienceAdminRoutes);
  app.use(errorHandler);
  return app;
}

let mongod;
let app;
const tokens = {};

const tokenFor = (user, tokenVersion = 0) => jwt.sign({ id: user._id, tokenVersion }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Experience.init();
  app = buildApp();

  const make = (name, role, extra = {}) =>
    User.create({ name, email: `${name}@example.com`, password: GOOD_PASSWORD, role, ...extra });
  tokens.admin = tokenFor(await make('admin', 'admin', { twoFactorEnabled: true }));
  tokens.admin2 = tokenFor(await make('admin2', 'admin', { twoFactorEnabled: true }));
  tokens.adminNo2fa = tokenFor(await make('adminno2fa', 'admin'));
  tokens.inactiveAdmin = tokenFor(await make('inactive', 'admin', { twoFactorEnabled: true, isActive: false }));
  tokens.teacher = tokenFor(await make('teacher', 'teacher'));
  tokens.creator = tokenFor(await make('creator', 'content_creator'));
  tokens.parent = tokenFor(await make('parent', 'parent'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

let pictureCounter;
beforeEach(async () => {
  await Experience.deleteMany({});
  jest.restoreAllMocks();
  jest.clearAllMocks();
  pictureCounter = 0;
  s3.uploadFileFromMulter.mockImplementation(async () => ({ url: `https://cdn.test/experiences/images/${++pictureCounter}.png` }));
  s3.getS3KeyFromUrl.mockImplementation((url) => (String(url).startsWith('https://cdn.test/') ? String(url).slice(17) : null));
  s3.deleteByKey.mockResolvedValue(undefined);
});

const as = (token, req) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
const api = {
  list: (token, query = '') => as(token, request(app).get(`${BASE}${query}`)),
  get: (token, uuid) => as(token, request(app).get(`${BASE}/${uuid}`)),
  create: (token, body) => as(token, request(app).post(BASE)).send(body),
  update: (token, uuid, body) => as(token, request(app).put(`${BASE}/${uuid}`)).send(body),
  publish: (token, uuid) => as(token, request(app).patch(`${BASE}/${uuid}/publish`)),
  unpublish: (token, uuid) => as(token, request(app).patch(`${BASE}/${uuid}/unpublish`)),
  reorder: (token, order) => as(token, request(app).post(`${BASE}/reorder`)).send({ order }),
  remove: (token, uuid) => as(token, request(app).delete(`${BASE}/${uuid}`)),
};

const validBody = (overrides = {}) => ({
  title: 'Strawberry Banana Smoothie',
  description: 'Make a smoothie',
  videos: [
    { title: 'Vocabulary', embedUrl: V1 },
    { title: 'The story', embedUrl: V2 },
  ],
  ...overrides,
});

async function createOne(overrides = {}, token = tokens.admin) {
  const res = await api.create(token, validBody(overrides));
  expect(res.status).toBe(201);
  return res.body.data;
}

const png = (size = 16) => Buffer.alloc(size, 1);

describe('who can reach it', () => {
  const requests = (uuid = UNKNOWN_UUID) => [
    ['GET list', (t) => api.list(t)],
    ['POST create', (t) => api.create(t, validBody())],
    ['POST reorder', (t) => api.reorder(t, [uuid])],
    ['GET one', (t) => api.get(t, uuid)],
    ['PUT update', (t) => api.update(t, uuid, { title: 'x' })],
    ['PATCH publish', (t) => api.publish(t, uuid)],
    ['PATCH unpublish', (t) => api.unpublish(t, uuid)],
    ['POST video reorder', (t) => as(t, request(app).post(`${BASE}/${uuid}/videos/reorder`)).send({ order: ['507f1f77bcf86cd799439011'] })],
    ['PATCH video position', (t) => as(t, request(app).patch(`${BASE}/${uuid}/videos/507f1f77bcf86cd799439011/position`)).send({ position: 1 })],
    ['DELETE', (t) => api.remove(t, uuid)],
  ];

  it.each(requests().map(([label, run]) => [label, run]))('%s: no token is 401', async (_label, run) => {
    const res = await run(null);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it.each(requests().map(([label, run]) => [label, run]))('%s: a garbage token is 401', async (_label, run) => {
    expect((await run('not.a.token')).status).toBe(401);
  });

  it.each(['parent', 'teacher', 'creator'])('%s can do none of it (403)', async (who) => {
    for (const [label, run] of requests()) {
      const res = await run(tokens[who]);
      expect([label, res.status]).toEqual([label, 403]);
      expect(res.body.message).toMatch(/not authorized/i);
    }
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('an admin who has not set up two-factor is refused (403) with its own code', async () => {
    const res = await api.list(tokens.adminNo2fa);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TWO_FACTOR_ENROLLMENT_REQUIRED');
  });

  it('a deactivated admin is refused (401)', async () => {
    expect((await api.list(tokens.inactiveAdmin)).status).toBe(401);
  });

  it('a token from before a password change is refused (401)', async () => {
    const admin = await User.findOne({ email: 'admin2@example.com' });
    admin.tokenVersion = 1;
    await admin.save();
    expect((await api.list(tokens.admin2)).status).toBe(401);
    admin.tokenVersion = 0;
    await admin.save();
  });

  it('a database failure while checking the login is a 500, never a 401 (it must not log anyone out)', async () => {
    jest.spyOn(User, 'findById').mockReturnValueOnce({ select: () => Promise.reject(new Error('db down')) });
    const res = await api.list(tokens.admin);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('an admin gets through', async () => {
    expect((await api.list(tokens.admin)).status).toBe(200);
  });
});

describe('the whole life of an experience', () => {
  it('create, read, edit, publish, reorder, unpublish and delete', async () => {
    const a = await createOne({ title: 'A' });
    const b = await createOne({ title: 'B' });
    expect(a).toMatchObject({ title: 'A', isPublished: false, order: 1 });
    expect(b.order).toBe(2);

    const read = await api.get(tokens.admin, a.uuid);
    expect(read.status).toBe(200);
    expect(read.body.data).toEqual(a);

    const edited = await api.update(tokens.admin, a.uuid, { description: 'Changed' });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ success: true, message: 'Experience updated.' });
    expect(edited.body.data.description).toBe('Changed');

    const published = await api.publish(tokens.admin, a.uuid);
    expect(published.status).toBe(200);
    expect(published.body.data).toMatchObject({ isPublished: true });
    expect(published.body.message).toBe('Experience published.');

    const reordered = await api.reorder(tokens.admin, [b.uuid, a.uuid]);
    expect(reordered.status).toBe(200);
    const list = await api.list(tokens.admin);
    expect(list.body.data.map((i) => i.title)).toEqual(['B', 'A']);
    expect(list.body.counts).toEqual({ all: 2, published: 1, draft: 1 });

    const hidden = await api.unpublish(tokens.admin, a.uuid);
    expect(hidden.body.data).toMatchObject({ isPublished: false, publishedAt: null });

    const deleted = await api.remove(tokens.admin, a.uuid);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toMatchObject({ success: true, message: 'Experience deleted.', data: { uuid: a.uuid, title: 'A' } });
    expect((await api.get(tokens.admin, a.uuid)).status).toBe(404);
    expect((await api.list(tokens.admin)).body.data.map((i) => i.title)).toEqual(['B']);
  });

  it('answers are JSON with `success`, and never contain database ids or internals', async () => {
    const created = await api.create(tokens.admin, validBody());
    const detail = await api.get(tokens.admin, created.body.data.uuid);
    const list = await api.list(tokens.admin);
    for (const res of [created, detail, list]) {
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.success).toBe(true);
      const text = JSON.stringify(res.body);
      expect(text).not.toMatch(/"_id"|"__v"|createdBy|updatedBy|password/);
    }
  });

  it('the video rows keep their ids across edits', async () => {
    const created = await createOne();
    const edited = await api.update(tokens.admin, created.uuid, {
      videos: [created.videos[1], created.videos[0]],
    });
    expect(edited.body.data.videos.map((v) => v.id)).toEqual([created.videos[1].id, created.videos[0].id]);
  });

  it('a player link is stored as the iframe link', async () => {
    const res = await api.create(tokens.admin, validBody({ videos: [{ title: 'V', embedUrl: 'https://player.mediadelivery.net/embed/660084/x' }] }));
    expect(res.body.data.videos[0].embedUrl).toBe('https://iframe.mediadelivery.net/embed/660084/x');
  });

  it('fields an admin must not set (id, uuid, order, creator) are ignored', async () => {
    const res = await api.create(tokens.admin, {
      ...validBody(),
      _id: '507f1f77bcf86cd799439011',
      uuid: UNKNOWN_UUID,
      order: 99,
      createdBy: '507f1f77bcf86cd799439011',
      isActive: false,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.uuid).not.toBe(UNKNOWN_UUID);
    expect(res.body.data.order).toBe(1);
    const stored = await Experience.findOne({ uuid: res.body.data.uuid });
    expect(String(stored.createdBy)).not.toBe('507f1f77bcf86cd799439011');
  });
});

describe('validation answers (400)', () => {
  it('lists every problem with its field', async () => {
    const res = await api.create(tokens.admin, { title: '', videos: [{ title: '', embedUrl: 'https://youtube.com/x' }] });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_FAILED', message: 'Please fix the highlighted fields.' });
    expect(res.body.errors.map((e) => e.field)).toEqual(['title', 'videos[0].title', 'videos[0].embedUrl']);
    expect(typeof res.body.requestId).toBe('string');
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('refuses a printable that is an outside link', async () => {
    const res = await api.create(tokens.admin, validBody({ printable: { link: 'https://www.facebook.com/x' } }));
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ field: 'printable.link', message: expect.stringMatching(/our own website/) }]);
  });

  it('refuses a body that is not an object', async () => {
    const res = await as(tokens.admin, request(app).post(BASE)).send([1, 2]);
    expect(res.status).toBe(400);
  });

  it('refuses an object where text is expected (no database operators get through)', async () => {
    const res = await api.create(tokens.admin, { title: { $gt: '' }, videos: [] });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('title');
  });

  it('an empty edit is 400 NOTHING_TO_UPDATE', async () => {
    const created = await createOne();
    const res = await api.update(tokens.admin, created.uuid, {});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NOTHING_TO_UPDATE');
  });

  it('broken JSON is a 400, not a 500', async () => {
    const res = await as(tokens.admin, request(app).post(BASE)).set('Content-Type', 'application/json').send('{"title": ');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('a body that is far too large is refused (413) before anything is read', async () => {
    const res = await api.create(tokens.admin, { title: 'x'.repeat(300 * 1024) });
    expect(res.status).toBe(413);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('refuses more videos than allowed', async () => {
    const videos = Array.from({ length: 21 }, (_, i) => ({ title: `v${i}`, embedUrl: `https://iframe.mediadelivery.net/embed/1/${i}` }));
    const res = await api.create(tokens.admin, validBody({ videos }));
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('videos');
  });

  it('refuses the same video twice', async () => {
    const res = await api.create(tokens.admin, validBody({ videos: [{ title: 'A', embedUrl: V1 }, { title: 'B', embedUrl: V1 }] }));
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatchObject({ field: 'videos[1].embedUrl' });
  });
});

describe('not found (404)', () => {
  it.each([
    ['an unknown uuid', UNKNOWN_UUID],
    ['a malformed id', 'abc'],
    ['a database id', '507f1f77bcf86cd799439011'],
    ['a path trick', '..%2F..%2Fadmin'],
  ])('every route answers 404 EXPERIENCE_NOT_FOUND for %s', async (_label, id) => {
    const results = await Promise.all([
      api.get(tokens.admin, id),
      api.update(tokens.admin, id, { title: 'x' }),
      api.publish(tokens.admin, id),
      api.unpublish(tokens.admin, id),
      api.remove(tokens.admin, id),
    ]);
    for (const res of results) {
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ success: false, code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' });
    }
  });

  it('"reorder" is never read as an id: GET /reorder is a plain 404', async () => {
    const res = await api.get(tokens.admin, 'reorder');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXPERIENCE_NOT_FOUND');
  });

  it('a route that does not exist is a 404 too', async () => {
    expect((await as(tokens.admin, request(app).patch(`${BASE}/${UNKNOWN_UUID}`)).send({})).status).toBe(404);
  });
});

describe('publishing rules (422)', () => {
  it('an experience with no videos cannot be published, and says why', async () => {
    const created = await createOne({ videos: [] });
    const res = await api.publish(tokens.admin, created.uuid);
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, code: 'PUBLISH_BLOCKED' });
    expect(res.body.errors).toEqual([{ field: 'videos', message: 'Add at least one video before publishing.' }]);
    expect((await api.get(tokens.admin, created.uuid)).body.data.isPublished).toBe(false);
  });

  it('creating it as published with no videos is refused and saves nothing', async () => {
    const res = await api.create(tokens.admin, validBody({ videos: [], isPublished: true }));
    expect(res.status).toBe(422);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('a published experience cannot lose its last video', async () => {
    const created = await createOne({ isPublished: true });
    const res = await api.update(tokens.admin, created.uuid, { videos: [] });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/unpublish/i);
    expect((await api.get(tokens.admin, created.uuid)).body.data.videos).toHaveLength(2);
  });

  it('publishing twice is fine (200, "already published")', async () => {
    const created = await createOne();
    await api.publish(tokens.admin, created.uuid);
    const again = await api.publish(tokens.admin, created.uuid);
    expect(again.status).toBe(200);
    expect(again.body.message).toBe('Experience was already published.');
    const hide = await api.unpublish(tokens.admin, created.uuid);
    const hideAgain = await api.unpublish(tokens.admin, created.uuid);
    expect(hide.body.message).toBe('Experience unpublished.');
    expect(hideAgain.body.message).toBe('Experience was already a draft.');
  });
});

describe('conflicts (409)', () => {
  it('an edit made on an out-of-date copy is refused and nothing is overwritten', async () => {
    const created = await createOne();
    const first = await api.update(tokens.admin, created.uuid, { title: 'By admin one', expectedUpdatedAt: created.updatedAt });
    expect(first.status).toBe(200);
    const second = await api.update(tokens.admin2, created.uuid, { title: 'By admin two', expectedUpdatedAt: created.updatedAt });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('EXPERIENCE_CONFLICT');
    expect((await api.get(tokens.admin, created.uuid)).body.data.title).toBe('By admin one');
  });

  it('an edit without expectedUpdatedAt is still accepted (last save wins)', async () => {
    const created = await createOne();
    await api.update(tokens.admin, created.uuid, { title: 'One' });
    expect((await api.update(tokens.admin2, created.uuid, { title: 'Two' })).status).toBe(200);
  });

  it('a reorder made on an out-of-date list is refused (REORDER_STALE) and nothing moves', async () => {
    const a = await createOne({ title: 'A' });
    const b = await createOne({ title: 'B' });
    await createOne({ title: 'C' });
    const res = await api.reorder(tokens.admin, [b.uuid, a.uuid]);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('REORDER_STALE');
    expect((await api.list(tokens.admin)).body.data.map((i) => i.title)).toEqual(['A', 'B', 'C']);
  });

  it('a reorder with a bad list is 400', async () => {
    const a = await createOne();
    for (const bad of [[], 'x', ['nope'], [a.uuid, a.uuid]]) {
      expect((await api.reorder(tokens.admin, bad)).status).toBe(400);
    }
  });
});

describe('the list: filters, search and paging', () => {
  beforeEach(async () => {
    await createOne({ title: 'Strawberry Smoothie', isPublished: true });
    await createOne({ title: 'Banana Bread' });
    await createOne({ title: 'Cooking (with 100% fun)', isPublished: true });
  });

  it('filters by status', async () => {
    expect((await api.list(tokens.admin, '?status=published')).body.data).toHaveLength(2);
    expect((await api.list(tokens.admin, '?status=draft')).body.data.map((i) => i.title)).toEqual(['Banana Bread']);
  });

  it('searches the title, with special characters taken literally', async () => {
    expect((await api.list(tokens.admin, '?search=banana')).body.data).toHaveLength(1);
    expect((await api.list(tokens.admin, `?search=${encodeURIComponent('(with 100%')}`)).body.data).toHaveLength(1);
    expect((await api.list(tokens.admin, `?search=${encodeURIComponent('.*')}`)).body.data).toHaveLength(0);
  });

  it('pages the results', async () => {
    const res = await api.list(tokens.admin, '?page=2&limit=2');
    expect(res.body.data.map((i) => i.title)).toEqual(['Cooking (with 100% fun)']);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
  });

  it.each([
    ['an unknown status', '?status=archived'],
    ['page 0', '?page=0'],
    ['a negative page', '?page=-3'],
    ['a text limit', '?limit=lots'],
    ['a database operator in the status', '?status[$ne]=draft'],
    ['a database operator in the search', '?search[$ne]=x'],
    ['a list in the search', '?search=a&search=b'],
  ])('refuses %s with 400', async (_label, query) => {
    const res = await api.list(tokens.admin, query);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('a limit above the maximum is cut down, not refused', async () => {
    expect((await api.list(tokens.admin, '?limit=100000')).body.pagination.limit).toBe(100);
  });
});

describe('pictures (multipart)', () => {
  const form = (token, method, path) => as(token, request(app)[method](path));
  const videosJson = JSON.stringify([{ title: 'V', embedUrl: V1 }]);

  it('creates with a cover and a printable picture, reading the list as JSON text', async () => {
    const res = await form(tokens.admin, 'post', BASE)
      .field('title', 'With pictures')
      .field('videos', videosJson)
      .field('printable', JSON.stringify({ link: 'https://riseup.kids/a.pdf', button: 'Print it' }))
      .field('isPublished', 'true')
      .attach('coverImage', png(), { filename: 'cover.png', contentType: 'image/png' })
      .attach('printableImage', png(), { filename: 'print.webp', contentType: 'image/webp' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'With pictures',
      isPublished: true,
      coverImage: 'https://cdn.test/experiences/images/1.png',
      printable: { image: 'https://cdn.test/experiences/images/2.png', link: 'https://riseup.kids/a.pdf', button: 'Print it' },
    });
    expect(res.body.data.videos).toHaveLength(1);
  });

  it('edits with a new cover, and can remove it with a form flag', async () => {
    const created = await form(tokens.admin, 'post', BASE)
      .field('title', 'Pic')
      .attach('coverImage', png(), { filename: 'a.jpg', contentType: 'image/jpeg' });
    const uuid = created.body.data.uuid;
    const replaced = await form(tokens.admin, 'put', `${BASE}/${uuid}`).attach('coverImage', png(), { filename: 'b.png', contentType: 'image/png' });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.coverImage).toBe('https://cdn.test/experiences/images/2.png');
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/1.png');
    const removed = await form(tokens.admin, 'put', `${BASE}/${uuid}`).field('removeCoverImage', 'true');
    expect(removed.status).toBe(200);
    expect(removed.body.data.coverImage).toBeNull();
  });

  it('a picture of the wrong type is 415 and nothing is saved', async () => {
    const res = await form(tokens.admin, 'post', BASE)
      .field('title', 'Bad file')
      .attach('coverImage', Buffer.from('%PDF'), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(415);
    expect(res.body).toMatchObject({ success: false, code: 'UNSUPPORTED_FILE_TYPE' });
    expect(await Experience.countDocuments()).toBe(0);
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
  });

  it('a picture over 8 MB is 413', async () => {
    const res = await form(tokens.admin, 'post', BASE)
      .field('title', 'Huge')
      .attach('coverImage', png(8 * 1024 * 1024 + 100), { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('a file under a field name we do not know is 400', async () => {
    const res = await form(tokens.admin, 'post', BASE)
      .field('title', 'Odd')
      .attach('video', png(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNEXPECTED_FILE');
  });

  it('two covers in one request is 400', async () => {
    const res = await form(tokens.admin, 'post', BASE)
      .field('title', 'Two')
      .attach('coverImage', png(), { filename: 'a.png', contentType: 'image/png' })
      .attach('coverImage', png(), { filename: 'b.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNEXPECTED_FILE');
  });

  it('a broken upload body is 400, not 500', async () => {
    const res = await as(tokens.admin, request(app).post(BASE)).set('Content-Type', 'multipart/form-data; boundary=xyz').send('garbage');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('list text that is not valid JSON is 400 with the field named', async () => {
    const res = await form(tokens.admin, 'post', BASE).field('title', 'x').field('videos', '[{oops');
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ field: 'videos', message: 'videos is not valid JSON.' }]);
  });

  it('when the picture cannot be stored: 502, a safe message, nothing saved', async () => {
    s3.uploadFileFromMulter.mockRejectedValueOnce(new Error('AccessDenied: arn:aws:iam::123456789012:user/secret'));
    const res = await form(tokens.admin, 'post', BASE)
      .field('title', 'x')
      .attach('coverImage', png(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('IMAGE_UPLOAD_FAILED');
    expect(JSON.stringify(res.body)).not.toMatch(/arn:|AccessDenied|secret/);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('deleting removes the stored pictures; a storage failure does not stop the delete', async () => {
    const created = await form(tokens.admin, 'post', BASE)
      .field('title', 'x')
      .attach('coverImage', png(), { filename: 'a.png', contentType: 'image/png' });
    s3.deleteByKey.mockRejectedValue(new Error('S3 down'));
    const res = await api.remove(tokens.admin, created.body.data.uuid);
    expect(res.status).toBe(200);
    expect(await Experience.countDocuments()).toBe(0);
  });
});

describe('unexpected failures', () => {
  const NODE_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV;
  });

  it('a database failure is a 500 that hides the detail in production and carries a request id', async () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(Experience, 'find').mockImplementationOnce(() => {
      throw new Error('MongoNetworkError: connect ECONNREFUSED 10.0.0.5:27017 (secret detail)');
    });
    const res = await api.list(tokens.admin);
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ success: false, message: 'Something went wrong. Please try again.' });
    expect(JSON.stringify(res.body)).not.toMatch(/Mongo|ECONNREFUSED|secret|stack/i);
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('a failure while saving is a 500 too, and leaves nothing half-saved', async () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(Experience, 'create').mockRejectedValueOnce(new Error('disk full'));
    const res = await api.create(tokens.admin, validBody());
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Something went wrong. Please try again.');
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('a request id sent by the client is kept (so support can trace it)', async () => {
    const res = await as(tokens.admin, request(app).get(BASE)).set('X-Request-Id', 'trace-abc-12345');
    expect(res.headers['x-request-id']).toBe('trace-abc-12345');
  });
});

describe('video positions and order', () => {
  const V3 = 'https://iframe.mediadelivery.net/embed/660084/video-three';
  const V4 = 'https://iframe.mediadelivery.net/embed/660084/video-four';
  const FOUR = [
    { title: 'One', embedUrl: V1 },
    { title: 'Two', embedUrl: V2 },
    { title: 'Three', embedUrl: V3 },
    { title: 'Four', embedUrl: V4 },
  ];
  const titles = (body) => body.data.videos.map((v) => v.title);
  const positions = (body) => body.data.videos.map((v) => v.position);
  const idOf = (experience, title) => experience.videos.find((v) => v.title === title).id;
  const STRANGER = '507f1f77bcf86cd799439011';
  const reorderVideos = (token, uuid, body) => as(token, request(app).post(`${BASE}/${uuid}/videos/reorder`)).send(body);
  const moveVideo = (token, uuid, videoId, body) => as(token, request(app).patch(`${BASE}/${uuid}/videos/${videoId}/position`)).send(body);

  it('every video has a position (from 1) in the answers of create, read and edit', async () => {
    const created = await api.create(tokens.admin, validBody({ videos: FOUR }));
    expect(positions(created.body)).toEqual([1, 2, 3, 4]);
    const read = await api.get(tokens.admin, created.body.data.uuid);
    expect(positions(read.body)).toEqual([1, 2, 3, 4]);
    const edited = await api.update(tokens.admin, created.body.data.uuid, { description: 'x' });
    expect(positions(edited.body)).toEqual([1, 2, 3, 4]);
  });

  it('POST /:uuid/videos/reorder saves the new order and numbers the positions', async () => {
    const created = await createOne({ videos: FOUR });
    const order = ['Three', 'One', 'Four', 'Two'].map((t) => idOf(created, t));
    const res = await reorderVideos(tokens.admin, created.uuid, { order });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'Video order saved.' });
    expect(titles(res.body)).toEqual(['Three', 'One', 'Four', 'Two']);
    expect(positions(res.body)).toEqual([1, 2, 3, 4]);
    const read = await api.get(tokens.admin, created.uuid);
    expect(titles(read.body)).toEqual(['Three', 'One', 'Four', 'Two']);
    expect(res.body.data.videos.map((v) => v.id)).toEqual(order);
  });

  it('PATCH /:uuid/videos/:videoId/position moves one video, and says so when it did not need to', async () => {
    const created = await createOne({ videos: FOUR });
    const moved = await moveVideo(tokens.admin, created.uuid, idOf(created, 'One'), { position: 3 });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ success: true, message: 'Video moved.' });
    expect(titles(moved.body)).toEqual(['Two', 'Three', 'One', 'Four']);
    expect(positions(moved.body)).toEqual([1, 2, 3, 4]);

    const again = await moveVideo(tokens.admin, created.uuid, idOf(created, 'One'), { position: 3 });
    expect(again.status).toBe(200);
    expect(again.body.message).toBe('Video was already at that position.');
    expect(again.body.data.updatedAt).toBe(moved.body.data.updatedAt);
  });

  it('editing with the list in a new order saves that order; positions that come along do not override it', async () => {
    const created = await createOne({ videos: FOUR });
    const reversed = [...created.videos].reverse(); // still carrying their old positions 4,3,2,1
    const res = await api.update(tokens.admin, created.uuid, { videos: reversed });
    expect(res.status).toBe(200);
    expect(titles(res.body)).toEqual(['Four', 'Three', 'Two', 'One']);
    expect(positions(res.body)).toEqual([1, 2, 3, 4]);
  });

  it('a bad position in an edit is a 400 naming the row', async () => {
    const created = await createOne({ videos: FOUR });
    const res = await api.update(tokens.admin, created.uuid, { videos: [{ ...created.videos[0], position: 0 }] });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ field: 'videos[0].position', message: 'Position must be a whole number of 1 or more.' }]);
  });

  it('moving videos is an edit: the updatedAt changes, and it shows in the list', async () => {
    const created = await createOne({ videos: FOUR });
    const moved = await moveVideo(tokens.admin, created.uuid, idOf(created, 'Four'), { position: 1 });
    expect(new Date(moved.body.data.updatedAt).getTime()).toBeGreaterThan(new Date(created.updatedAt).getTime());
    const list = await api.list(tokens.admin);
    expect(list.body.data[0].updatedAt).toBe(moved.body.data.updatedAt);
    expect(list.body.data[0].videoCount).toBe(4);
    expect(JSON.stringify(list.body.data[0])).not.toMatch(/position|embedUrl/);
  });

  describe('reorder: the refusals', () => {
    let experience;
    beforeEach(async () => {
      experience = await createOne({ videos: FOUR });
    });
    const ids = () => experience.videos.map((v) => v.id);

    it.each([
      ['no list', {}],
      ['an empty list', { order: [] }],
      ['text instead of a list', { order: 'abc' }],
    ])('%s is 400', async (_label, body) => {
      const res = await reorderVideos(tokens.admin, experience.uuid, body);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_FAILED' });
    });

    it('an id that is not a video id, or one listed twice, is 400 naming the position', async () => {
      const bad = await reorderVideos(tokens.admin, experience.uuid, { order: [ids()[0], 'nope', ids()[2], ids()[3]] });
      expect(bad.status).toBe(400);
      expect(bad.body.errors).toEqual([{ field: 'order[1]', message: 'Not a valid video id.' }]);
      const twice = await reorderVideos(tokens.admin, experience.uuid, { order: [ids()[0], ids()[1], ids()[1], ids()[3]] });
      expect(twice.body.errors).toEqual([{ field: 'order[2]', message: 'This video is listed twice.' }]);
    });

    it('a list that no longer matches (a video was removed meanwhile) is 409 VIDEO_REORDER_STALE and nothing moves', async () => {
      await api.update(tokens.admin, experience.uuid, { videos: experience.videos.slice(0, 3) });
      const res = await reorderVideos(tokens.admin, experience.uuid, { order: [...ids()].reverse() });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('VIDEO_REORDER_STALE');
      expect(titles((await api.get(tokens.admin, experience.uuid)).body)).toEqual(['One', 'Two', 'Three']);
    });

    it('an out-of-date copy of the experience is 409 EXPERIENCE_CONFLICT', async () => {
      await api.update(tokens.admin, experience.uuid, { description: 'Changed by someone else' });
      const res = await reorderVideos(tokens.admin, experience.uuid, { order: [...ids()].reverse(), expectedUpdatedAt: experience.updatedAt });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EXPERIENCE_CONFLICT');
      expect(titles((await api.get(tokens.admin, experience.uuid)).body)).toEqual(['One', 'Two', 'Three', 'Four']);
    });

    it('an unknown or malformed experience is 404', async () => {
      for (const id of [UNKNOWN_UUID, 'abc', STRANGER]) {
        const res = await reorderVideos(tokens.admin, id, { order: ids() });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('EXPERIENCE_NOT_FOUND');
      }
    });
  });

  describe('move: the refusals', () => {
    let experience;
    beforeEach(async () => {
      experience = await createOne({ videos: FOUR });
    });
    const first = () => experience.videos[0].id;

    it.each([[0], [5], [-2], [1.5], ['2'], [null]])('position %p is 400, saying what is allowed', async (position) => {
      const res = await moveVideo(tokens.admin, experience.uuid, first(), { position });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ field: 'position', message: 'Position must be a whole number from 1 to 4.' }]);
    });

    it('no body at all is 400 too', async () => {
      const res = await as(tokens.admin, request(app).patch(`${BASE}/${experience.uuid}/videos/${first()}/position`));
      expect(res.status).toBe(400);
    });

    it('a video that is not in the experience is 404 VIDEO_NOT_FOUND (also a malformed id)', async () => {
      for (const id of [STRANGER, 'abc', '123456789abc']) {
        const res = await moveVideo(tokens.admin, experience.uuid, id, { position: 1 });
        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ code: 'VIDEO_NOT_FOUND', message: 'Video not found in this experience.' });
      }
    });

    it('a video of another experience cannot be moved through this one', async () => {
      const other = await createOne({ title: 'Other', videos: [{ title: 'Elsewhere', embedUrl: V1 }] });
      const res = await moveVideo(tokens.admin, experience.uuid, other.videos[0].id, { position: 1 });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('VIDEO_NOT_FOUND');
    });

    it('an unknown or malformed experience is 404 EXPERIENCE_NOT_FOUND', async () => {
      for (const id of [UNKNOWN_UUID, 'abc']) {
        const res = await moveVideo(tokens.admin, id, first(), { position: 1 });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('EXPERIENCE_NOT_FOUND');
      }
    });

    it('an out-of-date copy of the experience is 409 and nothing moves', async () => {
      await api.update(tokens.admin, experience.uuid, { description: 'Changed by someone else' });
      const res = await moveVideo(tokens.admin, experience.uuid, first(), { position: 4, expectedUpdatedAt: experience.updatedAt });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EXPERIENCE_CONFLICT');
      expect(titles((await api.get(tokens.admin, experience.uuid)).body)).toEqual(['One', 'Two', 'Three', 'Four']);
    });
  });

  it('moving videos never moves the experiences, and the experiences reorder still works next to it', async () => {
    const a = await createOne({ title: 'A', videos: FOUR });
    const b = await createOne({ title: 'B', videos: FOUR });
    await moveVideo(tokens.admin, a.uuid, idOf(a, 'Four'), { position: 1 });
    const reordered = await api.reorder(tokens.admin, [b.uuid, a.uuid]);
    expect(reordered.status).toBe(200);
    const list = await api.list(tokens.admin);
    expect(list.body.data.map((i) => i.title)).toEqual(['B', 'A']);
    expect(titles((await api.get(tokens.admin, a.uuid)).body)).toEqual(['Four', 'One', 'Two', 'Three']);
    expect(titles((await api.get(tokens.admin, b.uuid)).body)).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('a failure while saving the order is a 500 that hides the detail in production', async () => {
    const created = await createOne({ videos: FOUR });
    const NODE_ENV = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      jest.spyOn(Experience.prototype, 'save').mockRejectedValueOnce(new Error('MongoServerError: disk full on 10.0.0.5'));
      const res = await reorderVideos(tokens.admin, created.uuid, { order: created.videos.map((v) => v.id).reverse() });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Something went wrong. Please try again.');
      expect(JSON.stringify(res.body)).not.toMatch(/Mongo|disk|10\.0\.0\.5/);
    } finally {
      process.env.NODE_ENV = NODE_ENV;
    }
  });
});
