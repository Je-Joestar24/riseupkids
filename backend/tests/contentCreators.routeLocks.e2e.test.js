/**
 * Content creator access areas (step B5), end to end over real HTTP: every route a content creator can reach, against
 * every kind of user, with the real routers, middleware and an in-memory MongoDB. The handlers behind the locks are
 * the real ones, so a route "passes" when it gets past the lock (the handler may then answer 400 or 404 to our empty
 * request, which is fine: the lock is what is tested here).
 *
 * Three outcomes are told apart:
 *  - LOCK  : 403 with code ACCESS_AREA_REQUIRED  (a creator without the area)
 *  - ROLE  : 403 without that code               (this role may not use the route at all)
 *  - PASS  : anything else except 401            (got past the locks)
 *
 * The table of routes is checked against the real routers, so a new route that nobody decided about fails the test.
 * @see docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md
 */
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { User } = require('../models');
const errorHandler = require('../middleware/errorHandler');
const { ACCESS_AREA_KEYS, LEGACY_CREATOR_AREAS, effectiveAreas } = require('../utils/accessAreas');
const logger = require('../config/logger');

jest.setTimeout(180000);

const ALL = ['admin', 'teacher', 'content_creator'];
const OBJECT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * Every router a content creator can reach. `rules`: 'METHOD path' -> { roles, areas }
 *  - roles : who may use the route at all (the role check that was always there)
 *  - handlerRefuses : roles the role check lets in but the handler itself then refuses with a 403 (a parent asking
 *    about a child that is not theirs). Unrelated to the access areas; recorded so the table stays honest.
 *  - areas : a creator also needs ONE of these areas (omit = no area needed, e.g. reading Explore)
 */
const content = (extra = {}) => ({ roles: ALL, areas: ['contents'], ...extra });
const ROUTERS = [
  {
    base: '/api/activities',
    file: 'activity',
    rules: {
      'POST /': content(), 'GET /': content(), 'GET /:id': content(), 'PUT /:id': content(),
      'DELETE /:id': content(), 'PATCH /:id/restore': content(),
    },
  },
  {
    base: '/api/videos',
    file: 'video',
    rules: { 'POST /': content(), 'GET /': content(), 'GET /:id': content(), 'PUT /:id': content(), 'DELETE /:id': content() },
  },
  {
    base: '/api/books',
    file: 'book',
    rules: {
      'POST /': content(), 'GET /': content(), 'GET /:id': content(), 'PUT /:id': content(),
      'PATCH /:id/archive': content(), 'PATCH /:id/unarchive': content(), 'DELETE /:id': content(),
    },
  },
  {
    base: '/api/chants',
    file: 'chant',
    rules: {
      'POST /:id/child/:childId/start': { roles: ['parent', 'admin'], handlerRefuses: ['parent'] },
      'GET /:id/child/:childId/progress': { roles: ['parent', 'admin', 'teacher'], handlerRefuses: ['parent'] },
      'POST /:id/child/:childId/complete': { roles: ['parent', 'admin'], handlerRefuses: ['parent'] },
      'POST /': content(), 'GET /': content(), 'GET /:id': content(), 'PUT /:id': content(), 'DELETE /:id': content(),
    },
  },
  {
    base: '/api/audio-assignments',
    file: 'audioAssignment',
    rules: {
      'GET /submissions': { roles: ['admin', 'teacher'] },
      'POST /:id/child/:childId/start': { roles: ['parent', 'admin'], handlerRefuses: ['parent'] },
      'GET /:id/child/:childId/progress': { roles: ['parent', 'admin', 'teacher'], handlerRefuses: ['parent'] },
      'POST /:id/child/:childId/submit': { roles: ['parent', 'admin'], handlerRefuses: ['parent'] },
      'POST /:id/child/:childId/review': { roles: ['admin', 'teacher'] },
      'POST /': content(), 'GET /': content(), 'GET /:id': content(), 'PUT /:id': content(), 'DELETE /:id': content(),
    },
  },
  {
    // Reading Explore is open to every signed-in user (children use it); only the writes need the area
    base: '/api/explore',
    file: 'explore',
    rules: {
      'GET /featured': { roles: ['admin', 'teacher', 'content_creator', 'parent'] },
      'GET /type/:type': { roles: ['admin', 'teacher', 'content_creator', 'parent'] },
      'GET /': { roles: ['admin', 'teacher', 'content_creator', 'parent'] },
      'GET /:id': { roles: ['admin', 'teacher', 'content_creator', 'parent'] },
      'POST /': content({ areas: ['explore'] }),
      'POST /reorder': { roles: ['admin', 'teacher'] },
      'PUT /:id': content({ areas: ['explore'] }),
      'DELETE /:id': content({ areas: ['explore'] }),
    },
  },
  {
    // Writes need Built-in Books. The two reads are shared with the Contents page ("Select built-in book")
    base: '/api/admin/cms-books',
    file: 'cmsBookAdmin',
    rules: {
      'POST /media': content({ areas: ['built_in_books'] }),
      'POST /': content({ areas: ['built_in_books'] }),
      'GET /': content({ areas: ['built_in_books', 'contents'] }),
      'GET /:id': content({ areas: ['built_in_books', 'contents'] }),
      'PUT /:id': content({ areas: ['built_in_books'] }),
      'PATCH /:id/publish': content({ areas: ['built_in_books'] }),
      'PATCH /:id/unpublish': content({ areas: ['built_in_books'] }),
      'PATCH /:id/archive': content({ areas: ['built_in_books'] }),
      'DELETE /:id': content({ areas: ['built_in_books'] }),
    },
  },
  {
    base: '/api/admin/star-cam/missions',
    file: 'starCamMissionsAdmin',
    rules: Object.fromEntries(
      [
        'GET /categories', 'POST /categories', 'GET /', 'POST /', 'GET /:id', 'PATCH /:id', 'POST /:id/publish',
        'POST /:id/unpublish', 'POST /:id/archive', 'POST /:id/vocab', 'PATCH /:id/vocab/:sortOrder/inclusion',
        'PATCH /:id/vocab/:sortOrder', 'DELETE /:id/vocab/:sortOrder', 'PATCH /:id/items/:sortOrder',
        'DELETE /:id/items/:sortOrder', 'POST /:id/mission-image', 'POST /:id/mission-media',
      ].map((key) => [key, content({ areas: ['star_cam_missions'] })])
    ),
  },
  {
    base: '/api/admin/star-cam/label-catalog',
    file: 'starCamLabelCatalog',
    rules: Object.fromEntries(
      [
        'GET /search', 'GET /recent-custom', 'GET /labels', 'POST /custom', 'PATCH /labels/:labelId/availability',
        'POST /labels/bulk-availability',
      ].map((key) => [key, content({ areas: ['star_cam_missions'] })])
    ),
  },
  {
    // Admin only until now: a creator can use it with the Notifications area, a teacher still cannot
    base: '/api/admin/notifications',
    file: 'adminNotifications',
    rules: Object.fromEntries(
      [
        'GET /meta', 'GET /dashboard', 'POST /images', 'DELETE /images/:mediaId', 'GET /', 'POST /', 'GET /:id/preview',
        'GET /:id/analytics', 'POST /:id/duplicate', 'POST /:id/schedule', 'POST /:id/cancel', 'POST /:id/send-now',
        'POST /:id/test', 'GET /:id', 'PATCH /:id',
      ].map((key) => [key, { roles: ['admin', 'content_creator'], areas: ['notifications'] }])
    ),
  },
  {
    base: '/api/admin/experiences',
    file: 'experienceAdmin',
    rules: Object.fromEntries(
      [
        'GET /', 'POST /', 'POST /reorder', 'GET /:uuid', 'PUT /:uuid', 'PATCH /:uuid/publish', 'PATCH /:uuid/unpublish',
        'POST /:uuid/videos/reorder', 'PATCH /:uuid/videos/:videoId/position', 'DELETE /:uuid',
      ].map((key) => [key, { roles: ['admin', 'content_creator'], areas: ['experiences'] }])
    ),
  },
];

const routesOf = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));

const fillParams = (path) =>
  path
    .replace(':uuid', '123e4567-e89b-42d3-a456-426614174000')
    .replace(':type', 'video')
    .replace(':sortOrder', '1')
    .replace(':labelId', 'label-1')
    .replace(':videoId', 'video-1')
    .replace(/:[A-Za-z]+/g, OBJECT_ID);

const trailingSlash = (url) => (url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url);

let mongod;
let app;
let people;
let warnSpy;
let errorSpy;
let infoSpy;

const tokenFor = (user) => jwt.sign({ id: String(user._id), tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  ROUTERS.forEach(({ base, file }) => app.use(base, require(`../routes/${file}.routes`)));
  app.use(errorHandler);

  const make = (name, role, extra = {}) =>
    User.create({ name, email: `${name}@example.com`, password: 'CorrectHorse42', role, ...extra });

  people = {
    admin: await make('admin', 'admin', { twoFactorEnabled: true }),
    teacher: await make('teacher', 'teacher'),
    parent: await make('parent', 'parent'),
  };
  // A creator from before this feature: no saved list at all
  const { insertedId } = await User.collection.insertOne({
    name: 'legacy', email: 'legacy@example.com', password: 'x'.repeat(60), role: 'content_creator', isActive: true,
    tokenVersion: 0, createdAt: new Date(), updatedAt: new Date(),
  });
  people.legacy = await User.findById(insertedId);
  for (const area of ACCESS_AREA_KEYS) {
    people[`only:${area}`] = await make(`only-${area}`, 'content_creator', { accessAreas: [area] });
  }
  people.everything = await make('everything', 'content_creator', { accessAreas: [...ACCESS_AREA_KEYS] });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

beforeEach(() => {
  warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  infoSpy.mockRestore();
});

const outcomeOf = (res) => {
  if (res.status === 401) return 'UNAUTH';
  if (res.status === 403) return res.body && res.body.code === 'ACCESS_AREA_REQUIRED' ? 'LOCK' : 'ROLE';
  return 'PASS';
};

const expectedFor = (rule, who) => {
  const user = people[who];
  if (!rule.roles.includes(user.role)) return 'ROLE';
  if (rule.handlerRefuses && rule.handlerRefuses.includes(user.role)) return 'ROLE';
  if (user.role !== 'content_creator' || !rule.areas) return 'PASS';
  const has = effectiveAreas(user);
  return rule.areas.some((area) => has.includes(area)) ? 'PASS' : 'LOCK';
};

const call = (router, key, who) => {
  const [method, path] = key.split(' ');
  const url = trailingSlash(`${router.base}${fillParams(path)}`);
  let req = request(app)[method.toLowerCase()](url);
  if (who) req = req.set('Authorization', `Bearer ${tokenFor(people[who])}`);
  return method === 'GET' || method === 'DELETE' ? req : req.send({});
};

describe('the table of routes is complete (a new route must be decided here)', () => {
  it.each(ROUTERS.map((entry) => [entry.base, entry]))('%s: every route is in the table, and the table has no extras', (_base, entry) => {
    const real = routesOf(require(`../routes/${entry.file}.routes`)).sort();

    expect(real).toEqual(Object.keys(entry.rules).sort());
  });
});

const PEOPLE = ['admin', 'teacher', 'parent', 'legacy', ...ACCESS_AREA_KEYS.map((area) => `only:${area}`), 'everything'];

describe.each(ROUTERS.map((entry) => [entry.base, entry]))('%s: who gets through', (_base, entry) => {
  const keys = Object.keys(entry.rules);

  it('refuses a request with no token (401) on every route', async () => {
    for (const key of keys) {
      const res = await call(entry, key, null);
      expect([key, res.status]).toEqual([key, 401]);
    }
  });

  it.each(PEOPLE)('%s: each route gives the expected outcome', async (who) => {
    const wrong = [];
    for (const key of keys) {
      const res = await call(entry, key, who);
      const actual = outcomeOf(res);
      const expected = expectedFor(entry.rules[key], who);
      if (actual !== expected) wrong.push(`${key} -> ${actual} (${res.status}), expected ${expected}`);
    }
    expect(wrong).toEqual([]);
  });
});

describe('the headline cases, spelled out', () => {
  it('a Notifications-only creator reaches Notifications and nothing else a creator could use', async () => {
    const notifications = await call(ROUTERS.find((r) => r.base === '/api/admin/notifications'), 'GET /meta', 'only:notifications');
    expect(outcomeOf(notifications)).toBe('PASS');
    for (const base of ['/api/activities', '/api/videos', '/api/books', '/api/chants', '/api/audio-assignments', '/api/admin/cms-books', '/api/admin/star-cam/missions', '/api/admin/experiences']) {
      const entry = ROUTERS.find((r) => r.base === base);
      const res = await call(entry, 'GET /', 'only:notifications');
      expect([base, outcomeOf(res)]).toEqual([base, 'LOCK']);
    }
    const explore = await call(ROUTERS.find((r) => r.base === '/api/explore'), 'POST /', 'only:notifications');
    expect(outcomeOf(explore)).toBe('LOCK');
  });

  it('a creator from before this feature still reaches all of her content tools, and not Notifications or Experiences', async () => {
    expect(effectiveAreas(people.legacy)).toEqual(LEGACY_CREATOR_AREAS);
    for (const base of ['/api/activities', '/api/videos', '/api/books', '/api/chants', '/api/audio-assignments', '/api/admin/cms-books', '/api/admin/star-cam/missions']) {
      const res = await call(ROUTERS.find((r) => r.base === base), 'GET /', 'legacy');
      expect([base, outcomeOf(res)]).toEqual([base, 'PASS']);
    }
    expect(outcomeOf(await call(ROUTERS.find((r) => r.base === '/api/explore'), 'POST /', 'legacy'))).toBe('PASS');
    expect(outcomeOf(await call(ROUTERS.find((r) => r.base === '/api/admin/notifications'), 'GET /meta', 'legacy'))).toBe('LOCK');
    expect(outcomeOf(await call(ROUTERS.find((r) => r.base === '/api/admin/experiences'), 'GET /', 'legacy'))).toBe('LOCK');
  });

  it('the Contents page can still read the built-in books it lets you pick, but not change them', async () => {
    const cms = ROUTERS.find((r) => r.base === '/api/admin/cms-books');

    expect(outcomeOf(await call(cms, 'GET /', 'only:contents'))).toBe('PASS');
    expect(outcomeOf(await call(cms, 'GET /:id', 'only:contents'))).toBe('PASS');
    expect(outcomeOf(await call(cms, 'POST /', 'only:contents'))).toBe('LOCK');
    expect(outcomeOf(await call(cms, 'PUT /:id', 'only:contents'))).toBe('LOCK');
    expect(outcomeOf(await call(cms, 'DELETE /:id', 'only:contents'))).toBe('LOCK');
    expect(outcomeOf(await call(cms, 'POST /media', 'only:contents'))).toBe('LOCK');
  });

  it('a refusal says which area, in a message the creator can read, as a 403 and never a 401', async () => {
    const res = await call(ROUTERS.find((r) => r.base === '/api/admin/notifications'), 'GET /meta', 'only:explore');

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        code: 'ACCESS_AREA_REQUIRED',
        message: "You don't have access to Notifications. Ask an admin if you need it.",
      })
    );
  });

  it('a teacher and a parent still cannot reach Notifications or Experiences (role check unchanged)', async () => {
    for (const base of ['/api/admin/notifications', '/api/admin/experiences']) {
      const entry = ROUTERS.find((r) => r.base === base);
      for (const who of ['teacher', 'parent']) {
        const res = await call(entry, 'GET /', who);
        expect([base, who, res.status, res.body.code]).toEqual([base, who, 403, undefined]);
      }
    }
  });

  it('reading Explore stays open to everyone signed in, a creator without the Explore area included', async () => {
    const explore = ROUTERS.find((r) => r.base === '/api/explore');

    for (const who of ['only:notifications', 'only:dashboard', 'parent']) {
      expect(outcomeOf(await call(explore, 'GET /featured', who))).toBe('PASS');
      expect(outcomeOf(await call(explore, 'GET /', who))).toBe('PASS');
    }
  });

  it('an admin is never limited, even on routes a creator needs an area for', async () => {
    for (const entry of ROUTERS) {
      const key = Object.keys(entry.rules).find((candidate) => entry.rules[candidate].roles.includes('admin') && candidate.startsWith('GET'));
      const res = await call(entry, key, 'admin');
      expect([entry.base, outcomeOf(res)]).toEqual([entry.base, 'PASS']);
    }
  });

  it('removing an area takes effect on the very next request, with the same token', async () => {
    const entry = ROUTERS.find((r) => r.base === '/api/admin/notifications');
    const user = await User.create({ name: 'live', email: 'live@example.com', password: 'CorrectHorse42', role: 'content_creator', accessAreas: ['notifications'] });
    people.live = user;
    const token = tokenFor(user);
    const get = () => request(app).get('/api/admin/notifications/meta').set('Authorization', `Bearer ${token}`);

    const before = await get();
    await User.updateOne({ _id: user._id }, { $set: { accessAreas: ['explore'] } });
    const after = await get();
    await User.updateOne({ _id: user._id }, { $set: { accessAreas: ['notifications', 'explore'] } });
    const restored = await get();

    expect([outcomeOf(before), outcomeOf(after), outcomeOf(restored)]).toEqual(['PASS', 'LOCK', 'PASS']);
    expect(entry).toBeDefined();
  });
});
