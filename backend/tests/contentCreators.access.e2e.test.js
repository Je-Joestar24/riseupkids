/**
 * Content creator access areas (step B4), end to end over real HTTP: the real routes, controller, service, models and
 * validation run together against an in-memory MongoDB. Only the database engine and the password-breach lookup are
 * stood in for.
 *
 * What matters most:
 *  - an admin chooses what a creator can use when creating her, and can change it later (reduce it too);
 *  - a bad list is refused with a clear code BEFORE anything is written;
 *  - a creator without a saved list (every creator before this feature) keeps exactly what she had;
 *  - changing access never logs her out and never touches her password, her status or her content;
 *  - only admins can read or change any of it.
 * @see docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md
 */
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000',
  AUTH_PASSWORD_RESET_MAX: '100000',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

// The real password-breach lookup goes through axios; an empty answer means "not breached"
jest.mock('axios');

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const { User } = require('../models');
const RefreshToken = require('../models/RefreshToken');
const contentCreatorRoutes = require('../routes/contentCreators.routes');
const authRoutes = require('../routes/auth.routes');
const errorHandler = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { ACCESS_AREA_KEYS, LEGACY_CREATOR_AREAS } = require('../utils/accessAreas');

jest.setTimeout(60000);

const PASSWORD = 'CorrectHorse42';
const GOOD = ['dashboard', 'contents'];

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/content-creators', contentCreatorRoutes);
  app.use(errorHandler);
  return app;
}

let mongod;
let app;
let infoSpy;
let warnSpy;
let errorSpy;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = buildApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

let admin;
let teacher;
let parent;

const tokenFor = (user) => jwt.sign({ id: String(user._id), tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
const as = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

/** A creator exactly as every creator was stored BEFORE this feature: no access list at all. */
async function insertLegacyCreator(name = 'Legacy', email = `${name.toLowerCase()}@example.com`, extra = {}) {
  const { insertedId } = await User.collection.insertOne({
    name,
    email,
    password: 'x'.repeat(60),
    role: 'content_creator',
    isActive: true,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });
  return User.findById(insertedId);
}

const rawUser = (id) => User.collection.findOne({ _id: new mongoose.Types.ObjectId(String(id)) });

const createViaApi = (body, who = admin) =>
  request(app)
    .post('/api/content-creators')
    .set(as(who))
    .send({ name: 'New Creator', email: 'new@example.com', password: PASSWORD, ...body });

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})]);
  axios.get.mockReset().mockResolvedValue({ data: '' });
  infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
  warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

  admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: PASSWORD, role: 'admin', twoFactorEnabled: true });
  teacher = await User.create({ name: 'Teacher', email: 'teacher@example.com', password: PASSWORD, role: 'teacher' });
  parent = await User.create({ name: 'Parent', email: 'parent@example.com', password: PASSWORD, role: 'parent' });
});

afterEach(() => {
  infoSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

const accessLogs = () =>
  infoSpy.mock.calls.filter(([payload]) => payload && payload.event === 'content_creator_access_changed').map(([payload]) => payload);

describe('GET /api/content-creators/access-areas (what the admin form draws)', () => {
  it('lists the seven checkboxes in order and which ones current creators have', async () => {
    const res = await request(app).get('/api/content-creators/access-areas').set(as(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.areas.map((area) => area.key)).toEqual(ACCESS_AREA_KEYS);
    expect(res.body.data.areas.every((area) => area.label && area.help)).toBe(true);
    expect(res.body.data.legacyAreas).toEqual(LEGACY_CREATOR_AREAS);
    expect(res.body.data.areas.find((area) => area.key === 'notifications').legacy).toBe(false);
  });

  it('is not mistaken for a creator id', async () => {
    const res = await request(app).get('/api/content-creators/access-areas').set(as(admin));

    expect(res.status).toBe(200);
    expect(res.body.code).toBeUndefined();
  });

  it.each([['teacher'], ['parent']])('is admin only: a %s gets a 403', async (who) => {
    const res = await request(app).get('/api/content-creators/access-areas').set(as(who === 'teacher' ? teacher : parent));

    expect(res.status).toBe(403);
  });

  it('needs a token', async () => {
    expect((await request(app).get('/api/content-creators/access-areas')).status).toBe(401);
  });
});

describe('POST /api/content-creators (create with access)', () => {
  it('creates a creator with exactly the chosen areas, and records who set them', async () => {
    const res = await createViaApi({ accessAreas: ['notifications', 'experiences'] });

    expect(res.status).toBe(201);
    expect(res.body.data.accessAreas).toEqual(['notifications', 'experiences']);
    expect(res.body.data).not.toHaveProperty('password');

    const stored = await rawUser(res.body.data._id);
    expect(stored.role).toBe('content_creator');
    expect(stored.accessAreas).toEqual(['notifications', 'experiences']);
    expect(String(stored.accessUpdatedBy)).toBe(String(admin._id));
    expect(stored.accessUpdatedAt).toBeInstanceOf(Date);
  });

  it('can be a Notifications-only creator, with no dashboard and no content areas', async () => {
    const res = await createViaApi({ accessAreas: ['notifications'] });

    expect(res.status).toBe(201);
    expect(res.body.data.accessAreas).toEqual(['notifications']);
  });

  it('puts a list in the usual order and drops duplicates, whatever order was sent', async () => {
    const res = await createViaApi({ accessAreas: ['experiences', 'dashboard', 'experiences', 'contents'] });

    expect(res.body.data.accessAreas).toEqual(['dashboard', 'contents', 'experiences']);
    expect((await rawUser(res.body.data._id)).accessAreas).toEqual(['dashboard', 'contents', 'experiences']);
  });

  it.each([
    ['no list', undefined, 'ACCESS_AREAS_REQUIRED'],
    ['a null list', null, 'ACCESS_AREAS_REQUIRED'],
    ['an empty list', [], 'ACCESS_AREAS_EMPTY'],
    ['a list that is not a list', 'contents', 'ACCESS_AREAS_INVALID'],
    ['an unknown area', ['contents', 'billing'], 'ACCESS_AREAS_INVALID'],
    ['a non-text area', [1], 'ACCESS_AREAS_INVALID'],
    ['a wrong-case area', ['Contents'], 'ACCESS_AREAS_INVALID'],
  ])('refuses %s with a 400 and its code, and creates nobody', async (_label, accessAreas, code) => {
    const res = await createViaApi({ accessAreas });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe(code);
    expect(typeof res.body.message).toBe('string');
    expect(await User.countDocuments({ email: 'new@example.com' })).toBe(0);
  });

  it('says which area is unknown', async () => {
    const res = await createViaApi({ accessAreas: ['billing'] });

    expect(res.body.message).toBe('Unknown area: billing.');
  });

  it('keeps refusing a missing name, email or password as before (no access code)', async () => {
    const res = await request(app)
      .post('/api/content-creators')
      .set(as(admin))
      .send({ email: 'x@example.com', password: PASSWORD, accessAreas: GOOD });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please provide name, email, and password');
    expect(res.body.code).toBeUndefined();
  });

  it('keeps answering 409 when the email is already used', async () => {
    await createViaApi({ accessAreas: GOOD });

    const res = await createViaApi({ accessAreas: GOOD });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/);
  });

  it.each([['teacher'], ['parent']])('is admin only: a %s cannot create a creator', async (who) => {
    const res = await createViaApi({ accessAreas: GOOD }, who === 'teacher' ? teacher : parent);

    expect(res.status).toBe(403);
    expect(await User.countDocuments({ email: 'new@example.com' })).toBe(0);
  });

  it('writes one line in the log: who gave whom which areas', async () => {
    const res = await createViaApi({ accessAreas: ['notifications'] });

    const [line] = accessLogs();
    expect(accessLogs()).toHaveLength(1);
    expect(line).toEqual(
      expect.objectContaining({
        actorId: String(admin._id),
        creatorId: res.body.data._id,
        before: [],
        after: ['notifications'],
        added: ['notifications'],
        removed: [],
      })
    );
  });

  it('lets the new creator sign in, and the answer carries her list', async () => {
    await createViaApi({ accessAreas: ['notifications'] });

    const login = await request(app).post('/api/auth/login').send({ email: 'new@example.com', password: PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('content_creator');
    expect(login.body.data.user.accessAreas).toEqual(['notifications']);
  });
});

describe('creators from before this feature (no saved list)', () => {
  it('are stored without any list at all', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    expect((await rawUser(legacy._id)).accessAreas).toBeUndefined();
  });

  it('appear in the list and in the detail with exactly what they had: no Notifications, no Experiences', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    const list = await request(app).get('/api/content-creators').set(as(admin));
    const detail = await request(app).get(`/api/content-creators/${legacy._id}`).set(as(admin));

    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].accessAreas).toEqual(LEGACY_CREATOR_AREAS);
    expect(detail.body.data.accessAreas).toEqual(LEGACY_CREATOR_AREAS);
    expect(detail.body.data.accessAreas).not.toContain('notifications');
    expect(detail.body.data.accessAreas).not.toContain('experiences');
  });

  it('see the same on login and on /auth/me', async () => {
    const created = await createViaApi({ accessAreas: GOOD, email: 'cr@example.com' });
    // Put her back to "never given a list", as every older creator is
    await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(created.body.data._id) }, { $unset: { accessAreas: '' } });

    const login = await request(app).post('/api/auth/login').send({ email: 'cr@example.com', password: PASSWORD });
    const me = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${login.body.data.token}` });

    expect(login.body.data.user.accessAreas).toEqual(LEGACY_CREATOR_AREAS);
    expect(me.body.data.user.accessAreas).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('keep having no list when only their name is edited', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    const res = await request(app).put(`/api/content-creators/${legacy._id}`).set(as(admin)).send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
    expect(res.body.data.accessAreas).toEqual(LEGACY_CREATOR_AREAS);
    const stored = await rawUser(legacy._id);
    expect(stored.accessAreas).toBeUndefined();
    expect(stored.accessUpdatedBy).toBeUndefined();
  });

  it('keep having no list after archive and restore', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    await request(app).delete(`/api/content-creators/${legacy._id}`).set(as(admin));
    await request(app).put(`/api/content-creators/${legacy._id}/restore`).set(as(admin));

    expect((await rawUser(legacy._id)).accessAreas).toBeUndefined();
  });

  it('show a saved list as saved, next to a legacy one, in the same list', async () => {
    await insertLegacyCreator('Legacy');
    await createViaApi({ accessAreas: ['notifications'], name: 'Saved', email: 'saved@example.com' });

    const list = await request(app).get('/api/content-creators').set(as(admin));

    const byName = Object.fromEntries(list.body.data.map((row) => [row.name, row.accessAreas]));
    expect(byName.Legacy).toEqual(LEGACY_CREATOR_AREAS);
    expect(byName.Saved).toEqual(['notifications']);
  });
});

describe('PUT /api/content-creators/:id (edit, with or without access)', () => {
  it('changes the list together with other fields', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    const res = await request(app)
      .put(`/api/content-creators/${legacy._id}`)
      .set(as(admin))
      .send({ name: 'Renamed', accessAreas: ['explore', 'notifications'] });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
    expect(res.body.data.accessAreas).toEqual(['explore', 'notifications']);
    const stored = await rawUser(legacy._id);
    expect(stored.accessAreas).toEqual(['explore', 'notifications']);
    expect(String(stored.accessUpdatedBy)).toBe(String(admin._id));
  });

  it('leaves a saved list alone when none is sent', async () => {
    const created = await createViaApi({ accessAreas: ['notifications'] });

    await request(app).put(`/api/content-creators/${created.body.data._id}`).set(as(admin)).send({ name: 'Renamed' });

    expect((await rawUser(created.body.data._id)).accessAreas).toEqual(['notifications']);
  });

  it('logs a change of access only when the list really changed', async () => {
    const created = await createViaApi({ accessAreas: ['notifications'] });
    const id = created.body.data._id;
    infoSpy.mockClear();

    await request(app).put(`/api/content-creators/${id}`).set(as(admin)).send({ name: 'Renamed', accessAreas: ['notifications'] });
    expect(accessLogs()).toHaveLength(0);

    await request(app).put(`/api/content-creators/${id}`).set(as(admin)).send({ accessAreas: ['notifications', 'explore'] });
    expect(accessLogs()).toHaveLength(1);
    expect(accessLogs()[0]).toEqual(expect.objectContaining({ before: ['notifications'], after: ['explore', 'notifications'] }));
  });

  it.each([
    ['null', null, 'ACCESS_AREAS_REQUIRED'],
    ['an empty list', [], 'ACCESS_AREAS_EMPTY'],
    ['an unknown area', ['billing'], 'ACCESS_AREAS_INVALID'],
    ['text instead of a list', 'contents', 'ACCESS_AREAS_INVALID'],
  ])('refuses %s and changes nothing else in the same request', async (_label, accessAreas, code) => {
    const created = await createViaApi({ accessAreas: ['notifications'] });
    const id = created.body.data._id;

    const res = await request(app).put(`/api/content-creators/${id}`).set(as(admin)).send({ name: 'Should not apply', accessAreas });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
    const stored = await rawUser(id);
    expect(stored.name).toBe('New Creator');
    expect(stored.accessAreas).toEqual(['notifications']);
  });

  it('answers 404 with the creator code for an unknown creator', async () => {
    const res = await request(app)
      .put(`/api/content-creators/${new mongoose.Types.ObjectId()}`)
      .set(as(admin))
      .send({ accessAreas: GOOD });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONTENT_CREATOR_NOT_FOUND');
  });

  it('answers 404 when the person is not a creator (and changes nothing)', async () => {
    const res = await request(app).put(`/api/content-creators/${parent._id}`).set(as(admin)).send({ accessAreas: GOOD });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONTENT_CREATOR_NOT_FOUND');
    expect((await rawUser(parent._id)).accessAreas).toBeUndefined();
  });
});

describe('PUT /api/content-creators/:id/access (manage access)', () => {
  it('reduces a current creator to fewer areas and says what she had before', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    const res = await request(app).put(`/api/content-creators/${legacy._id}/access`).set(as(admin)).send({ accessAreas: ['explore'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.changed).toBe(true);
    expect(res.body.previousAccessAreas).toEqual(LEGACY_CREATOR_AREAS);
    expect(res.body.data.accessAreas).toEqual(['explore']);
    expect(res.body.data).not.toHaveProperty('password');
    const stored = await rawUser(legacy._id);
    expect(stored.accessAreas).toEqual(['explore']);
    expect(String(stored.accessUpdatedBy)).toBe(String(admin._id));
  });

  it('widens a list too, and the new areas appear', async () => {
    const created = await createViaApi({ accessAreas: ['dashboard'] });

    const res = await request(app)
      .put(`/api/content-creators/${created.body.data._id}/access`)
      .set(as(admin))
      .send({ accessAreas: ['dashboard', 'notifications', 'experiences'] });

    expect(res.body.data.accessAreas).toEqual(['dashboard', 'notifications', 'experiences']);
    expect(res.body.previousAccessAreas).toEqual(['dashboard']);
  });

  it('is a no-op when the list is the same: 200, changed false, nothing logged', async () => {
    const created = await createViaApi({ accessAreas: ['notifications'] });
    infoSpy.mockClear();

    const res = await request(app)
      .put(`/api/content-creators/${created.body.data._id}/access`)
      .set(as(admin))
      .send({ accessAreas: ['notifications'] });

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(false);
    expect(accessLogs()).toHaveLength(0);
  });

  it('writes the legacy set down as a saved list when asked, without reporting a change', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    const res = await request(app)
      .put(`/api/content-creators/${legacy._id}/access`)
      .set(as(admin))
      .send({ accessAreas: LEGACY_CREATOR_AREAS });

    expect(res.body.changed).toBe(false);
    expect((await rawUser(legacy._id)).accessAreas).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('takes the areas in any order and without duplicates', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    const res = await request(app)
      .put(`/api/content-creators/${legacy._id}/access`)
      .set(as(admin))
      .send({ accessAreas: ['explore', 'dashboard', 'explore'] });

    expect(res.body.data.accessAreas).toEqual(['dashboard', 'explore']);
  });

  it.each([
    ['no body at all', undefined, 'ACCESS_AREAS_REQUIRED'],
    ['an empty body', {}, 'ACCESS_AREAS_REQUIRED'],
    ['null', { accessAreas: null }, 'ACCESS_AREAS_REQUIRED'],
    ['an empty list', { accessAreas: [] }, 'ACCESS_AREAS_EMPTY'],
    ['an unknown area', { accessAreas: ['contents', 'payroll'] }, 'ACCESS_AREAS_INVALID'],
    ['text instead of a list', { accessAreas: 'contents' }, 'ACCESS_AREAS_INVALID'],
    ['an object', { accessAreas: { contents: true } }, 'ACCESS_AREAS_INVALID'],
  ])('refuses %s with a 400 and its code, and keeps her list', async (_label, body, code) => {
    const created = await createViaApi({ accessAreas: ['notifications'] });

    const req = request(app).put(`/api/content-creators/${created.body.data._id}/access`).set(as(admin));
    const res = await (body === undefined ? req : req.send(body));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
    expect((await rawUser(created.body.data._id)).accessAreas).toEqual(['notifications']);
  });

  it.each([
    ['an id nobody has', () => String(new mongoose.Types.ObjectId())],
    ['text that is not an id', () => 'not-an-id'],
    ['a 12-character text (not an id here)', () => 'abcdefghijkl'],
    ['a parent', () => String(parent._id)],
    ['an admin', () => String(admin._id)],
    ['a teacher', () => String(teacher._id)],
  ])('answers 404 with the creator code for %s, and writes nothing', async (_label, makeId) => {
    const res = await request(app).put(`/api/content-creators/${makeId()}/access`).set(as(admin)).send({ accessAreas: GOOD });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONTENT_CREATOR_NOT_FOUND');
    expect((await rawUser(parent._id)).accessAreas).toBeUndefined();
    expect((await rawUser(admin._id)).accessAreas).toBeUndefined();
    expect((await rawUser(teacher._id)).accessAreas).toBeUndefined();
  });

  it('works for an archived creator too', async () => {
    const created = await createViaApi({ accessAreas: GOOD });
    await request(app).delete(`/api/content-creators/${created.body.data._id}`).set(as(admin));

    const res = await request(app).put(`/api/content-creators/${created.body.data._id}/access`).set(as(admin)).send({ accessAreas: ['explore'] });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
    expect(res.body.data.accessAreas).toEqual(['explore']);
  });

  it('does not touch her password, her name, her email, her status or her sessions', async () => {
    const created = await createViaApi({ accessAreas: GOOD });
    const id = created.body.data._id;
    const before = await rawUser(id);

    await request(app).put(`/api/content-creators/${id}/access`).set(as(admin)).send({ accessAreas: ['explore'] });

    const after = await rawUser(id);
    expect(after.password).toBe(before.password);
    expect(after.name).toBe(before.name);
    expect(after.email).toBe(before.email);
    expect(after.isActive).toBe(before.isActive);
    expect(after.tokenVersion ?? 0).toBe(before.tokenVersion ?? 0);
  });

  it('does not log her out: the token she already has keeps working after her access is reduced', async () => {
    await createViaApi({ accessAreas: GOOD, email: 'cr@example.com' });
    const login = await request(app).post('/api/auth/login').send({ email: 'cr@example.com', password: PASSWORD });
    const token = login.body.data.token;
    const id = login.body.data.user._id;

    const reduce = await request(app).put(`/api/content-creators/${id}/access`).set(as(admin)).send({ accessAreas: ['notifications'] });
    const me = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${token}` });

    expect(reduce.status).toBe(200);
    expect(me.status).toBe(200);
    expect(me.body.data.user.accessAreas).toEqual(['notifications']);
  });

  it('writes one log line with who, whom, before, after, added and removed', async () => {
    const legacy = await insertLegacyCreator('Legacy');

    await request(app).put(`/api/content-creators/${legacy._id}/access`).set(as(admin)).send({ accessAreas: ['explore', 'notifications'] });

    expect(accessLogs()).toHaveLength(1);
    expect(accessLogs()[0]).toEqual(
      expect.objectContaining({
        actorId: String(admin._id),
        creatorId: String(legacy._id),
        before: LEGACY_CREATOR_AREAS,
        after: ['explore', 'notifications'],
        added: ['notifications'],
        removed: ['dashboard', 'contents', 'built_in_books', 'star_cam_missions'],
      })
    );
  });

  it('keeps names, emails and passwords out of the log line', async () => {
    const created = await createViaApi({ accessAreas: GOOD });
    infoSpy.mockClear();

    await request(app).put(`/api/content-creators/${created.body.data._id}/access`).set(as(admin)).send({ accessAreas: ['explore'] });

    const logged = JSON.stringify(accessLogs());
    expect(logged).not.toContain('new@example.com');
    expect(logged).not.toContain('New Creator');
    expect(logged).not.toContain(PASSWORD);
  });

  it('is admin only, and a creator cannot change her own access', async () => {
    const created = await createViaApi({ accessAreas: ['notifications'] });
    const id = created.body.data._id;
    const creator = await User.findById(id);

    const own = await request(app).put(`/api/content-creators/${id}/access`).set(as(creator)).send({ accessAreas: [...ACCESS_AREA_KEYS] });
    const byTeacher = await request(app).put(`/api/content-creators/${id}/access`).set(as(teacher)).send({ accessAreas: [...ACCESS_AREA_KEYS] });
    const byParent = await request(app).put(`/api/content-creators/${id}/access`).set(as(parent)).send({ accessAreas: [...ACCESS_AREA_KEYS] });
    const anonymous = await request(app).put(`/api/content-creators/${id}/access`).send({ accessAreas: [...ACCESS_AREA_KEYS] });

    expect([own.status, byTeacher.status, byParent.status, anonymous.status]).toEqual([403, 403, 403, 401]);
    expect((await rawUser(id)).accessAreas).toEqual(['notifications']);
  });

  it('a creator cannot read the list of creators or the access areas either', async () => {
    const created = await createViaApi({ accessAreas: ['notifications'] });
    const creator = await User.findById(created.body.data._id);

    expect((await request(app).get('/api/content-creators').set(as(creator))).status).toBe(403);
    expect((await request(app).get('/api/content-creators/access-areas').set(as(creator))).status).toBe(403);
  });

  it('answers a refusal as 403 or 404, never as a 401 that would log someone out', async () => {
    const created = await createViaApi({ accessAreas: ['notifications'] });
    const creator = await User.findById(created.body.data._id);

    const statuses = [
      (await request(app).put(`/api/content-creators/${created.body.data._id}/access`).set(as(creator)).send({ accessAreas: GOOD })).status,
      (await request(app).put(`/api/content-creators/${new mongoose.Types.ObjectId()}/access`).set(as(admin)).send({ accessAreas: GOOD })).status,
      (await request(app).put(`/api/content-creators/${created.body.data._id}/access`).set(as(admin)).send({ accessAreas: [] })).status,
    ];

    expect(statuses).toEqual([403, 404, 400]);
  });
});

describe('PUT /api/content-creators/access/bulk', () => {
  const putBulk = (body) => request(app).put('/api/content-creators/access/bulk').set(as(admin)).send(body);

  it('gives several creators the same list, and says what changed for each', async () => {
    const a = await insertLegacyCreator('Alpha');
    const b = await insertLegacyCreator('Beta');
    const c = await createViaApi({ accessAreas: ['explore'], name: 'Gamma', email: 'gamma@example.com' });

    const res = await putBulk({ ids: [String(a._id), String(b._id), c.body.data._id], accessAreas: ['explore'] });

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(3);
    expect(res.body.changed).toBe(2);
    expect(res.body.message).toBe('Access updated for 2 people');
    const byName = Object.fromEntries(res.body.data.map((row) => [row.name, row]));
    expect(byName.Alpha).toEqual(expect.objectContaining({ changed: true, previousAccessAreas: LEGACY_CREATOR_AREAS, accessAreas: ['explore'] }));
    expect(byName.Gamma.changed).toBe(false);
    for (const id of [a._id, b._id, c.body.data._id]) {
      const stored = await rawUser(id);
      expect(stored.accessAreas).toEqual(['explore']);
      expect(String(stored.accessUpdatedBy)).toBe(String(admin._id));
    }
  });

  it('says "1 person" for one', async () => {
    const a = await insertLegacyCreator('Alpha');

    const res = await putBulk({ ids: [String(a._id)], accessAreas: ['explore'] });

    expect(res.body.message).toBe('Access updated for 1 person');
  });

  it('is not mistaken for a creator id, and not swallowed by the other routes', async () => {
    const a = await insertLegacyCreator('Alpha');

    const res = await putBulk({ ids: [String(a._id)], accessAreas: ['explore'] });

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(1);
  });

  it('counts a person listed twice once', async () => {
    const a = await insertLegacyCreator('Alpha');

    const res = await putBulk({ ids: [String(a._id), String(a._id)], accessAreas: ['explore'] });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.matched).toBe(1);
  });

  it('writes one log line per person whose access really changed', async () => {
    const a = await insertLegacyCreator('Alpha');
    const b = await createViaApi({ accessAreas: ['explore'], name: 'Beta', email: 'beta@example.com' });
    infoSpy.mockClear();

    await putBulk({ ids: [String(a._id), b.body.data._id], accessAreas: ['explore'] });

    expect(accessLogs()).toHaveLength(1);
    expect(accessLogs()[0].creatorId).toBe(String(a._id));
  });

  it('changes nobody when one person in the list is a parent', async () => {
    const a = await insertLegacyCreator('Alpha');

    const res = await putBulk({ ids: [String(a._id), String(parent._id)], accessAreas: ['explore'] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ACCESS_BULK_INVALID');
    expect(res.body.message).toContain(String(parent._id));
    expect((await rawUser(a._id)).accessAreas).toBeUndefined();
    expect((await rawUser(parent._id)).accessAreas).toBeUndefined();
  });

  it('changes nobody when one id does not exist', async () => {
    const a = await insertLegacyCreator('Alpha');
    const ghost = String(new mongoose.Types.ObjectId());

    const res = await putBulk({ ids: [String(a._id), ghost], accessAreas: ['explore'] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ACCESS_BULK_INVALID');
    expect(res.body.message).toContain(ghost);
    expect((await rawUser(a._id)).accessAreas).toBeUndefined();
  });

  it('changes nobody when the list of areas is bad', async () => {
    const a = await insertLegacyCreator('Alpha');

    const res = await putBulk({ ids: [String(a._id)], accessAreas: ['explore', 'payroll'] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ACCESS_AREAS_INVALID');
    expect((await rawUser(a._id)).accessAreas).toBeUndefined();
  });

  it.each([
    ['no ids', { accessAreas: ['explore'] }],
    ['ids that are not a list', { ids: 'abc', accessAreas: ['explore'] }],
    ['an empty list of ids', { ids: [], accessAreas: ['explore'] }],
    ['an id that is not text', { ids: [123], accessAreas: ['explore'] }],
    ['an id that is not an id', { ids: ['not-an-id'], accessAreas: ['explore'] }],
    ['a 12-character text', { ids: ['abcdefghijkl'], accessAreas: ['explore'] }],
    ['a null id', { ids: [null], accessAreas: ['explore'] }],
    ['an object as id', { ids: [{ $ne: null }], accessAreas: ['explore'] }],
  ])('refuses %s with a 400 ACCESS_BULK_INVALID', async (_label, body) => {
    const a = await insertLegacyCreator('Alpha');

    const res = await putBulk(body);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ACCESS_BULK_INVALID');
    expect((await rawUser(a._id)).accessAreas).toBeUndefined();
  });

  it('refuses more than 100 people at once, and changes nobody', async () => {
    const a = await insertLegacyCreator('Alpha');
    const ids = [String(a._id), ...Array.from({ length: 100 }, () => String(new mongoose.Types.ObjectId()))];

    const res = await putBulk({ ids, accessAreas: ['explore'] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ACCESS_BULK_INVALID');
    expect(res.body.message).toBe('Choose at most 100 people at a time.');
    expect((await rawUser(a._id)).accessAreas).toBeUndefined();
  });

  it('accepts exactly 100 people', async () => {
    const created = [];
    for (let i = 0; i < 100; i += 1) {
      created.push(String((await insertLegacyCreator(`C${i}`, `c${i}@example.com`))._id));
    }

    const res = await putBulk({ ids: created, accessAreas: ['explore'] });

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(100);
    expect(await User.countDocuments({ accessAreas: ['explore'] })).toBe(100);
  });

  it('does not touch passwords or status', async () => {
    const a = await insertLegacyCreator('Alpha', 'alpha@example.com', { isActive: false });
    const before = await rawUser(a._id);

    await putBulk({ ids: [String(a._id)], accessAreas: ['explore'] });

    const after = await rawUser(a._id);
    expect(after.password).toBe(before.password);
    expect(after.isActive).toBe(false);
    expect(after.name).toBe('Alpha');
  });

  it('is admin only', async () => {
    const a = await insertLegacyCreator('Alpha');
    const creator = await createViaApi({ accessAreas: ['notifications'], email: 'cr@example.com' });
    const asCreator = await User.findById(creator.body.data._id);

    const statuses = [];
    for (const who of [teacher, parent, asCreator]) {
      const res = await request(app)
        .put('/api/content-creators/access/bulk')
        .set(as(who))
        .send({ ids: [String(a._id)], accessAreas: ['explore'] });
      statuses.push(res.status);
    }
    const anonymous = await request(app).put('/api/content-creators/access/bulk').send({ ids: [String(a._id)], accessAreas: ['explore'] });

    expect(statuses).toEqual([403, 403, 403]);
    expect(anonymous.status).toBe(401);
    expect((await rawUser(a._id)).accessAreas).toBeUndefined();
  });
});

describe('an unexpected failure', () => {
  const NODE_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV;
    jest.restoreAllMocks();
  });

  it('is a 500 with a generic message in production, not the raw error', async () => {
    process.env.NODE_ENV = 'production';
    const created = await createViaApi({ accessAreas: GOOD });
    const original = User.findById.bind(User);
    let calls = 0;
    jest.spyOn(User, 'findById').mockImplementation((...args) => {
      calls += 1;
      // The first call is the sign-in check; the next one is the service reading the creator
      if (calls > 1) throw new Error('connection to mongodb://user:secret@db.internal failed');
      return original(...args);
    });

    const res = await request(app).put(`/api/content-creators/${created.body.data._id}/access`).set(as(admin)).send({ accessAreas: ['explore'] });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('mongodb://');
    expect(res.body).not.toHaveProperty('code');
  });

  it('the same for bulk', async () => {
    process.env.NODE_ENV = 'production';
    const a = await insertLegacyCreator('Alpha');
    jest.spyOn(User, 'find').mockImplementation(() => {
      throw new Error('connection to mongodb://user:secret@db.internal failed');
    });

    const res = await request(app)
      .put('/api/content-creators/access/bulk')
      .set(as(admin))
      .send({ ids: [String(a._id)], accessAreas: ['explore'] });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
