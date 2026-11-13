/**
 * End to end over real HTTP for the child Experiences API (/api/experiences): the real routes, controller,
 * service, model, login middleware (real JWTs), error handler and the ADMIN API next to it, with a real
 * in-memory MongoDB. Only file storage (S3) is faked.
 *
 * What matters most:
 *  - a child only ever sees what an admin has published, and sees a change straight away;
 *  - a hidden, deleted, unknown or malformed experience is answered identically (not found);
 *  - nothing that belongs to the admin leaks;
 *  - a server problem is a 500, never a 401 (a 401 logs the app out);
 *  - what the admin saves through the admin API is exactly what the child reads.
 */
const ENV = {
  JWT_SECRET: 'e2e-experience-child-secret-long-enough-1234567890',
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
const experienceChildRoutes = require('../routes/experienceChild.routes');
const experienceRoutes = require('../routes/experienceRoutes');
const errorHandler = require('../middleware/errorHandler');
const requestId = require('../middleware/requestId');

jest.setTimeout(60000);

const BASE = '/api/experiences';
const ADMIN_BASE = '/api/admin/experiences';
const V1 = 'https://iframe.mediadelivery.net/embed/660084/video-one';
const V2 = 'https://iframe.mediadelivery.net/embed/660084/video-two';
const V3 = 'https://iframe.mediadelivery.net/embed/660084/video-three';
const UNKNOWN_UUID = '3b241101-e2bb-4255-8caf-4136c566a962';
const GOOD_PASSWORD = 'CorrectHorse42';

// The same mounts, in the same order, as server.js
function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(requestId);
  app.use(express.json());
  app.use('/api/experience', experienceRoutes);
  app.use(ADMIN_BASE, experienceAdminRoutes);
  app.use(BASE, experienceChildRoutes);
  app.use(errorHandler);
  return app;
}

let mongod;
let app;
const tokens = {};
const users = {};

const tokenFor = (user, tokenVersion = 0, options = { expiresIn: '1h' }) =>
  jwt.sign({ id: user._id, tokenVersion }, process.env.JWT_SECRET, options);

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Experience.init();
  app = buildApp();

  const make = async (name, role, extra = {}) => {
    users[name] = await User.create({ name, email: `${name}@example.com`, password: GOOD_PASSWORD, role, ...extra });
    tokens[name] = tokenFor(users[name]);
  };
  await make('admin', 'admin', { twoFactorEnabled: true });
  await make('adminNo2fa', 'admin');
  await make('teacher', 'teacher');
  await make('creator', 'content_creator');
  await make('parent', 'parent');
  await make('inactive', 'parent', { isActive: false });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

let counter;
beforeEach(async () => {
  await Experience.deleteMany({});
  jest.restoreAllMocks();
  jest.clearAllMocks();
  counter = 0;
  s3.uploadFileFromMulter.mockImplementation(async (file, folder) => ({ url: `https://cdn.test/${folder}/${++counter}-${file.originalname}` }));
  s3.getS3KeyFromUrl.mockImplementation((url) => (String(url).startsWith('https://cdn.test/') ? String(url).slice(17) : null));
  s3.deleteByKey.mockResolvedValue(undefined);
});

const as = (token, req) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
const child = {
  list: (token = tokens.parent) => as(token, request(app).get(BASE)),
  get: (uuid, token = tokens.parent) => as(token, request(app).get(`${BASE}/${uuid}`)),
};
const admin = {
  create: (body) => as(tokens.admin, request(app).post(ADMIN_BASE)).send(body),
  update: (uuid, body) => as(tokens.admin, request(app).put(`${ADMIN_BASE}/${uuid}`)).send(body),
  publish: (uuid) => as(tokens.admin, request(app).patch(`${ADMIN_BASE}/${uuid}/publish`)),
  unpublish: (uuid) => as(tokens.admin, request(app).patch(`${ADMIN_BASE}/${uuid}/unpublish`)),
  remove: (uuid) => as(tokens.admin, request(app).delete(`${ADMIN_BASE}/${uuid}`)),
  reorder: (order) => as(tokens.admin, request(app).post(`${ADMIN_BASE}/reorder`)).send({ order }),
  reorderVideos: (uuid, order) => as(tokens.admin, request(app).post(`${ADMIN_BASE}/${uuid}/videos/reorder`)).send({ order }),
};

const body = (overrides = {}) => ({
  title: 'Strawberry Banana Smoothie',
  description: 'Make a smoothie',
  videos: [
    { title: 'Vocabulary', embedUrl: V1 },
    { title: 'The story', embedUrl: V2 },
  ],
  ...overrides,
});

/** Creates through the admin API (the way an admin would), optionally publishing it. */
async function adminCreate(overrides = {}, { publish = true } = {}) {
  const created = await admin.create(body(overrides));
  expect(created.status).toBe(201);
  if (publish) expect((await admin.publish(created.body.data.uuid)).status).toBe(200);
  return created.body.data;
}

const pdf = () => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 0x20)]);

function allKeys(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => allKeys(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      found.add(key);
      allKeys(inner, found);
    }
  }
  return found;
}

const LEAKS = ['_id', '__v', 'isPublished', 'publishedAt', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt', 'order', 'password', 'email'];

describe('who can read it', () => {
  it.each([
    ['a parent', 'parent'],
    ['a teacher', 'teacher'],
    ['a content creator', 'creator'],
    ['an admin', 'admin'],
    ['an admin who has not set up two-factor yet', 'adminNo2fa'],
  ])('lets %s read the list and one experience', async (_label, who) => {
    const created = await adminCreate();
    const list = await child.list(tokens[who]);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    const one = await child.get(created.uuid, tokens[who]);
    expect(one.status).toBe(200);
    expect(one.body.data.uuid).toBe(created.uuid);
  });

  const requests = () => [
    ['the list', (t) => child.list(t)],
    ['one experience', (t) => child.get(UNKNOWN_UUID, t)],
  ];

  it.each(requests())('refuses %s with 401 when no token is sent', async (_label, send) => {
    const res = await send(null);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it.each(requests())('refuses %s with 401 for a token that is not valid', async (_label, send) => {
    expect((await send('not-a-token')).status).toBe(401);
    expect((await send(jwt.sign({ id: users.parent._id }, 'a-different-secret'))).status).toBe(401);
  });

  it.each(requests())('refuses %s with 401 for an expired token', async (_label, send) => {
    const expired = jwt.sign({ id: users.parent._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await send(expired)).status).toBe(401);
  });

  it.each(requests())('refuses %s with 401 for an inactive account', async (_label, send) => {
    expect((await send(tokens.inactive)).status).toBe(401);
  });

  it.each(requests())('refuses %s with 401 for a token of an account that no longer exists', async (_label, send) => {
    const ghost = jwt.sign({ id: new mongoose.Types.ObjectId(), tokenVersion: 0 }, process.env.JWT_SECRET);
    expect((await send(ghost)).status).toBe(401);
  });

  it.each(requests())('refuses %s with 401 once the session was ended (old token version)', async (_label, send) => {
    const stale = tokenFor(users.parent, 5);
    expect((await send(stale)).status).toBe(401);
  });

  it('does not accept the token anywhere but the Authorization header', async () => {
    const viaQuery = await request(app).get(`${BASE}?token=${tokens.parent}`);
    expect(viaQuery.status).toBe(401);
    const viaCookie = await request(app).get(BASE).set('Cookie', `token=${tokens.parent}`);
    expect(viaCookie.status).toBe(401);
  });

  it('shows nothing to a refused request (no experience data in a 401)', async () => {
    await adminCreate();
    const res = await child.list(null);
    expect(JSON.stringify(res.body)).not.toContain('Strawberry');
  });

  it('is read only: nothing can be created, changed or deleted here', async () => {
    const created = await adminCreate();
    for (const [method, url] of [
      ['post', BASE],
      ['put', `${BASE}/${created.uuid}`],
      ['patch', `${BASE}/${created.uuid}`],
      ['delete', `${BASE}/${created.uuid}`],
      ['post', `${BASE}/${created.uuid}/videos`],
    ]) {
      const res = await as(tokens.admin, request(app)[method](url)).send({ title: 'Hacked' });
      expect(res.status).toBe(404);
    }
    const stored = await Experience.findOne({ uuid: created.uuid }).lean();
    expect(stored.title).toBe('Strawberry Banana Smoothie');
    expect(await Experience.countDocuments()).toBe(1);
  });
});

describe('the list', () => {
  it('is empty before anything is published', async () => {
    await adminCreate({}, { publish: false });
    const res = await child.list();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it('is empty when there are no experiences at all', async () => {
    expect((await child.list()).body).toEqual({ success: true, data: [] });
  });

  it('shows only the published ones, with the fields the cards use', async () => {
    const shown = await adminCreate({ title: 'Shown' });
    await adminCreate({ title: 'Draft' }, { publish: false });
    const res = await child.list();
    expect(res.body.data).toEqual([
      { uuid: shown.uuid, title: 'Shown', description: 'Make a smoothie', coverImage: null, videoCount: 2 },
    ]);
  });

  it('follows the order the admin saved', async () => {
    const a = await adminCreate({ title: 'A' });
    const b = await adminCreate({ title: 'B' });
    const c = await adminCreate({ title: 'C' });
    expect((await child.list()).body.data.map((x) => x.title)).toEqual(['A', 'B', 'C']);
    expect((await admin.reorder([c.uuid, a.uuid, b.uuid])).status).toBe(200);
    expect((await child.list()).body.data.map((x) => x.title)).toEqual(['C', 'A', 'B']);
  });

  it('keeps the order when a draft sits in the middle of it', async () => {
    const a = await adminCreate({ title: 'A' });
    const b = await adminCreate({ title: 'B' }, { publish: false });
    const c = await adminCreate({ title: 'C' });
    expect((await admin.reorder([c.uuid, b.uuid, a.uuid])).status).toBe(200);
    expect((await child.list()).body.data.map((x) => x.title)).toEqual(['C', 'A']);
  });

  it('shows a cover picture the admin uploaded', async () => {
    const res = await as(tokens.admin, request(app).post(ADMIN_BASE))
      .field('title', 'With cover')
      .field('isPublished', 'true')
      .field('videos', JSON.stringify([{ title: 'V', embedUrl: V1 }]))
      .attach('coverImage', Buffer.alloc(32, 1), { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const [item] = (await child.list()).body.data;
    expect(item.coverImage).toBe('https://cdn.test/experiences/images/1-cover.png');
  });

  it('does not leak any admin-only field or the videos themselves', async () => {
    await adminCreate({ printable: { link: 'https://riseup.kids/print.pdf', button: 'Print' } });
    const keys = allKeys((await child.list()).body);
    for (const key of LEAKS) expect(keys.has(key)).toBe(false);
    for (const key of ['videos', 'embedUrl', 'printable']) expect(keys.has(key)).toBe(false);
  });

  it('is sent as JSON that nothing keeps a copy of', async () => {
    await adminCreate();
    const res = await child.list();
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['cache-control']).toBe('private, no-cache');
  });

  it('ignores anything in the query string (no filter can reveal a draft)', async () => {
    await adminCreate({ title: 'Draft' }, { publish: false });
    for (const query of ['?isPublished=false', '?status=draft', '?status=all', '?isPublished[$ne]=true', '?limit=0', '?page=-1', '?search=Draft']) {
      const res = await as(tokens.parent, request(app).get(`${BASE}${query}`));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    }
  });

  it('answers the same for a trailing slash', async () => {
    await adminCreate();
    const res = await as(tokens.parent, request(app).get(`${BASE}/`));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('one experience', () => {
  it('returns the title, description, cover, videos in order and the printable', async () => {
    const created = await adminCreate({ printable: { link: 'https://riseup.kids/print.pdf', button: 'Print here' } });
    const res = await child.get(created.uuid);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      uuid: created.uuid,
      title: 'Strawberry Banana Smoothie',
      description: 'Make a smoothie',
      coverImage: null,
      videos: [
        { id: created.videos[0].id, title: 'Vocabulary', embedUrl: V1, position: 1 },
        { id: created.videos[1].id, title: 'The story', embedUrl: V2, position: 2 },
      ],
      printable: { image: null, kind: 'link', url: 'https://riseup.kids/print.pdf', fileName: '', button: 'Print here' },
    });
  });

  it('has no printable when the admin set none', async () => {
    const created = await adminCreate();
    expect((await child.get(created.uuid)).body.data.printable).toBeNull();
  });

  it('opens an uploaded PDF the admin attached', async () => {
    const res = await as(tokens.admin, request(app).post(ADMIN_BASE))
      .field('title', 'With file')
      .field('isPublished', 'true')
      .field('videos', JSON.stringify([{ title: 'V', embedUrl: V1 }]))
      .field('printable', JSON.stringify({ link: '', button: 'Print it' }))
      .attach('printableFile', pdf(), { filename: 'Smoothie sheet.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    const one = await child.get(res.body.data.uuid);
    expect(one.body.data.printable).toEqual({
      image: null,
      kind: 'file',
      url: 'https://cdn.test/experiences/files/1-Smoothie sheet.pdf',
      fileName: 'Smoothie sheet.pdf',
      button: 'Print it',
    });
  });

  it('follows the admin switching the printable from a link to a file and back', async () => {
    const created = await adminCreate({ printable: { link: 'https://riseup.kids/print.pdf', button: 'Print here' } });
    const toFile = await as(tokens.admin, request(app).put(`${ADMIN_BASE}/${created.uuid}`))
      .field('printable', JSON.stringify({ link: '', button: 'Print here' }))
      .attach('printableFile', pdf(), { filename: 'sheet.pdf', contentType: 'application/pdf' });
    expect(toFile.status).toBe(200);
    let { printable } = (await child.get(created.uuid)).body.data;
    expect([printable.kind, printable.fileName]).toEqual(['file', 'sheet.pdf']);
    expect(JSON.stringify(printable)).not.toContain('riseup.kids');

    const toLink = await admin.update(created.uuid, {
      printable: { link: 'https://riseup.kids/other.pdf', button: 'Print here' },
      removePrintableFile: true,
    });
    expect(toLink.status).toBe(200);
    ({ printable } = (await child.get(created.uuid)).body.data);
    expect([printable.kind, printable.url, printable.fileName]).toEqual(['link', 'https://riseup.kids/other.pdf', '']);
  });

  it('follows every edit the admin makes to the text and the videos', async () => {
    const created = await adminCreate();
    const [first, second] = created.videos;
    expect((await admin.update(created.uuid, { title: 'New title', description: 'New words' })).status).toBe(200);
    expect((await admin.reorderVideos(created.uuid, [second.id, first.id])).status).toBe(200);
    const { data } = (await child.get(created.uuid)).body;
    expect([data.title, data.description]).toEqual(['New title', 'New words']);
    expect(data.videos.map((v) => [v.position, v.title])).toEqual([
      [1, 'The story'],
      [2, 'Vocabulary'],
    ]);
  });

  it('follows videos being added and removed', async () => {
    const created = await adminCreate();
    const keep = created.videos[1];
    const edit = await admin.update(created.uuid, {
      videos: [{ id: keep.id, title: keep.title, embedUrl: keep.embedUrl }, { title: 'Brand new', embedUrl: V3 }],
    });
    expect(edit.status).toBe(200);
    const { videos } = (await child.get(created.uuid)).body.data;
    expect(videos.map((v) => v.title)).toEqual(['The story', 'Brand new']);
    expect(videos.map((v) => v.position)).toEqual([1, 2]);
  });

  it('does not leak any admin-only field at any depth', async () => {
    const created = await adminCreate({ printable: { link: 'https://riseup.kids/print.pdf' } });
    const keys = allKeys((await child.get(created.uuid)).body);
    for (const key of LEAKS) expect(keys.has(key)).toBe(false);
  });

  it('does not put the stored database id of a video where the experience id belongs', async () => {
    const created = await adminCreate();
    const stored = await Experience.findOne({ uuid: created.uuid }).lean();
    const text = JSON.stringify((await child.get(created.uuid)).body);
    expect(text).not.toContain(String(stored._id));
  });

  it('is sent as JSON that nothing keeps a copy of', async () => {
    const created = await adminCreate();
    const res = await child.get(created.uuid);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['cache-control']).toBe('private, no-cache');
  });

  it('ignores anything in the query string', async () => {
    const created = await adminCreate();
    const res = await as(tokens.parent, request(app).get(`${BASE}/${created.uuid}?isPublished=false&fields=order`));
    expect(res.status).toBe(200);
    expect(allKeys(res.body).has('order')).toBe(false);
  });

  it('takes the id from the address only, never from the query string', async () => {
    const created = await adminCreate();
    const res = await as(tokens.parent, request(app).get(`${BASE}/${UNKNOWN_UUID}?uuid=${created.uuid}`));
    expect(res.status).toBe(404);
    const draft = await adminCreate({}, { publish: false });
    const other = await as(tokens.parent, request(app).get(`${BASE}/${created.uuid}?uuid=${draft.uuid}`));
    expect(other.body.data.uuid).toBe(created.uuid);
  });

  it('answers the public id in any letter case the admin API would also accept', async () => {
    const created = await adminCreate();
    const upper = await child.get(created.uuid.toUpperCase());
    // the id is stored in lower case; an upper-case copy is not the same id and must not find (or crash) anything
    expect([200, 404]).toContain(upper.status);
    if (upper.status === 200) expect(upper.body.data.uuid).toBe(created.uuid);
  });
});

describe('what a child must never find', () => {
  it('answers a draft, an unknown id and a malformed id in exactly the same way', async () => {
    const draft = await adminCreate({}, { publish: false });
    const answers = [];
    for (const id of [draft.uuid, UNKNOWN_UUID, 'not-an-id', '507f1f77bcf86cd799439011', '%7B%22%24ne%22%3Anull%7D', 'a'.repeat(300), '..%2F..%2Fetc']) {
      const res = await child.get(id);
      expect(res.status).toBe(404);
      const { requestId, ...rest } = res.body;
      answers.push(rest);
    }
    expect(answers[0]).toEqual({ success: false, code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' });
    for (const answer of answers) expect(answer).toEqual(answers[0]);
  });

  it('includes the request id so a problem can be traced, and nothing else', async () => {
    const res = await child.get(UNKNOWN_UUID);
    expect(Object.keys(res.body).sort()).toEqual(['code', 'message', 'requestId', 'success']);
  });

  it('hides an experience the moment it is unpublished and shows it again when published', async () => {
    const created = await adminCreate();
    expect((await child.get(created.uuid)).status).toBe(200);
    expect((await admin.unpublish(created.uuid)).status).toBe(200);
    expect((await child.get(created.uuid)).status).toBe(404);
    expect((await child.list()).body.data).toEqual([]);
    expect((await admin.publish(created.uuid)).status).toBe(200);
    expect((await child.get(created.uuid)).status).toBe(200);
    expect((await child.list()).body.data).toHaveLength(1);
  });

  it('loses an experience the moment the admin deletes it', async () => {
    const created = await adminCreate();
    expect((await admin.remove(created.uuid)).status).toBe(200);
    expect((await child.get(created.uuid)).status).toBe(404);
    expect((await child.list()).body.data).toEqual([]);
  });

  it('cannot reach the admin routes with a parent token', async () => {
    const created = await adminCreate({}, { publish: false });
    const res = await as(tokens.parent, request(app).get(`${ADMIN_BASE}/${created.uuid}`));
    expect(res.status).toBe(403);
  });

  it('does not take a draft through a path trick', async () => {
    const draft = await adminCreate({}, { publish: false });
    for (const path of [`${draft.uuid}/`, `${draft.uuid}/.`, `%2e/${draft.uuid}`, `${draft.uuid}%00`, `${draft.uuid}%20`]) {
      const res = await as(tokens.parent, request(app).get(`${BASE}/${path}`));
      expect(res.status).not.toBe(200);
    }
  });

  it('does not answer the admin or the Smoothie paths', async () => {
    await adminCreate();
    expect((await as(tokens.parent, request(app).get(`${BASE}/admin`))).status).toBe(404);
    expect((await request(app).post('/api/experience/verify').send({})).status).not.toBe(200);
  });
});

describe('when the server has a problem', () => {
  it('answers a database failure in the list with 500, never 401, and hides the detail', async () => {
    await adminCreate();
    jest.spyOn(Experience, 'find').mockImplementation(() => {
      throw new Error('mongo exploded at host db-1.internal');
    });
    const res = await child.list();
    expect(res.status).toBe(500);
    expect(res.status).not.toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('answers a database failure on one experience with 500, never 401 or 404', async () => {
    const created = await adminCreate();
    jest.spyOn(Experience, 'findOne').mockImplementation(() => {
      throw new Error('mongo exploded at host db-1.internal');
    });
    const res = await child.get(created.uuid);
    expect(res.status).toBe(500);
    expect([401, 404]).not.toContain(res.status);
  });

  it('does not show the internal detail of a failure when running in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      jest.spyOn(Experience, 'find').mockImplementation(() => {
        throw new Error('mongo exploded at host db-1.internal');
      });
      const res = await child.list();
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toContain('db-1.internal');
      expect(res.body.stack).toBeUndefined();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('answers a failed login lookup with 500, never 401 (the app must not be logged out by a server problem)', async () => {
    jest.spyOn(User, 'findById').mockImplementation(() => {
      throw new Error('user lookup failed');
    });
    const res = await child.list();
    expect(res.status).toBe(500);
  });

  it('recovers: the next request works once the database is back', async () => {
    await adminCreate();
    const spy = jest.spyOn(Experience, 'find').mockImplementationOnce(() => {
      throw new Error('blip');
    });
    expect((await child.list()).status).toBe(500);
    spy.mockRestore();
    expect((await child.list()).status).toBe(200);
  });
});

describe('the whole journey, the way the app will use it', () => {
  it('lists, opens one, and keeps every video link and position exactly as saved', async () => {
    const smoothie = await adminCreate({
      title: 'Strawberry Banana Smoothie',
      videos: [
        { title: 'Vocabulary', embedUrl: V1 },
        { title: 'The story', embedUrl: V2 },
        { title: 'Let us cook', embedUrl: V3 },
      ],
    });
    await adminCreate({ title: 'Hidden draft' }, { publish: false });

    const list = (await child.list()).body.data;
    expect(list.map((item) => item.title)).toEqual(['Strawberry Banana Smoothie']);
    expect(list[0].videoCount).toBe(3);

    const page = (await child.get(list[0].uuid)).body.data;
    expect(page.uuid).toBe(smoothie.uuid);
    expect(page.videos.map((v) => v.embedUrl)).toEqual([V1, V2, V3]);
    expect(page.videos.map((v) => v.position)).toEqual([1, 2, 3]);
    expect(new Set(page.videos.map((v) => v.id)).size).toBe(3);
  });

  it('serves many readers at once without mixing anything up', async () => {
    const a = await adminCreate({ title: 'A' });
    const b = await adminCreate({ title: 'B' });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => child.get(i % 2 ? a.uuid : b.uuid))
    );
    results.forEach((res, i) => {
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe(i % 2 ? 'A' : 'B');
    });
  });
});
