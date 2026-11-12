/**
 * Regression: adding the admin Experiences must not disturb what already worked.
 *
 *  - the free Smoothie page on the sales site (/api/experience, Flodesk email check) still behaves the
 *    same, even with the admin routes mounted next to it, and the two never answer for each other;
 *  - the server mounts both, on different paths;
 *  - the model list and the Explore content model are intact;
 *  - the new code follows the repo's logging rules and never reads the old environment links.
 */
const ENV = {
  JWT_SECRET: 'regression-experience-secret-long-enough-1234567890',
  FLODESK_API_KEY: 'regression-flodesk-key',
  FLODESK_FREEBIE_SEGMENT_PT: 'seg-pt',
  EXPERIENCE_VIDEOS_PT: 'https://player.mediadelivery.net/embed/660084/video-one,https://player.mediadelivery.net/embed/660084/video-two',
  EXPERIENCE_ACCESS_MAX: '100000',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

jest.mock('axios');
jest.mock('../services/captcha.service', () => ({ verifyCaptcha: jest.fn() }));

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const axios = require('axios');
const mongoose = require('mongoose');
const { verifyCaptcha } = require('../services/captcha.service');
const experienceRoutes = require('../routes/experienceRoutes');
const experienceAdminRoutes = require('../routes/experienceAdmin.routes');
const models = require('../models');
const errorHandler = require('../middleware/errorHandler');

jest.setTimeout(60000);

const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  // The same two lines, in the same order, as server.js
  app.use('/api/experience', experienceRoutes);
  app.use('/api/admin/experiences', experienceAdminRoutes);
  app.use(errorHandler);
  return app;
}

let mongod;
let app;

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

beforeEach(() => {
  jest.clearAllMocks();
  verifyCaptcha.mockResolvedValue({ verified: true, score: 0.9, reason: null });
});

describe('the free Smoothie page (/api/experience) is unchanged', () => {
  const verify = (body) => request(app).post('/api/experience/verify').send({ email: 'parent@example.com', language: 'pt', captchaToken: 'tok', ...body });

  it('a confirmed subscriber still gets the two links from the settings and a device token', async () => {
    axios.get.mockResolvedValue({ data: { id: 's1', status: 'active', segments: [{ id: 'seg-pt' }] } });
    const res = await verify();
    expect(res.status).toBe(200);
    expect(res.body.data.videos).toEqual([
      'https://player.mediadelivery.net/embed/660084/video-one',
      'https://player.mediadelivery.net/embed/660084/video-two',
    ]);
    expect(typeof res.body.data.token).toBe('string');
  });

  it('a stranger still gets the same single "no" and no links', async () => {
    axios.get.mockResolvedValue({ data: { status: 'active', segments: [{ id: 'other' }] } });
    const res = await verify();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EXPERIENCE_ACCESS_DENIED');
    expect(JSON.stringify(res.body)).not.toMatch(/mediadelivery/);
  });

  it('a bot still never reaches Flodesk', async () => {
    verifyCaptcha.mockResolvedValue({ verified: false, score: 0.1, reason: 'low-score' });
    expect((await verify()).status).toBe(400);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('a returning device still reopens with its token', async () => {
    axios.get.mockResolvedValue({ data: { status: 'active', segments: [{ id: 'seg-pt' }] } });
    const { token } = (await verify()).body.data;
    const res = await request(app).post('/api/experience/session').send({ token, language: 'pt' });
    expect(res.status).toBe(200);
    expect(res.body.data.videos).toHaveLength(2);
  });

  it('is public: it never asks for a login, and the admin list is not reachable through it', async () => {
    const res = await request(app).get('/api/experience');
    expect(res.status).toBe(404); // there is no such route there; the admin list does not leak into this path
  });
});

describe('the two APIs never answer for each other', () => {
  it('the admin list needs a login (401), even though the public page does not', async () => {
    expect((await request(app).get('/api/admin/experiences')).status).toBe(401);
  });

  it('the public verify path is not served by the admin router', async () => {
    const res = await request(app).post('/api/admin/experiences/verify').send({ email: 'a@b.co' });
    expect(res.status).toBe(401); // the admin router asks for a login first; it never runs the Flodesk check
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('the admin paths are not served under the public one', async () => {
    const res = await request(app).post('/api/experience/reorder').send({ order: [] });
    expect(res.status).toBe(404);
  });
});

describe('the server mounts both, on different paths', () => {
  const server = read('server.js');

  it('mounts the free page and the admin API once each', () => {
    expect(server.match(/app\.use\('\/api\/experience',\s*experienceRoutes\)/g)).toHaveLength(1);
    expect(server.match(/app\.use\('\/api\/admin\/experiences',\s*experienceAdminRoutes\)/g)).toHaveLength(1);
    expect(server).toContain("require('./routes/experienceAdmin.routes')");
  });

  it('keeps the other admin and explore routes mounted', () => {
    for (const mount of [
      "'/api/explore'",
      "'/api/explore/videos'",
      "'/api/admin/leads'",
      "'/api/admin/cms-books'",
      "'/api/admin/notifications'",
      "'/api/admin/module-access'",
      "'/api/kids-wall'",
    ]) {
      expect(server).toContain(`app.use(${mount}`);
    }
  });
});

describe('the models are intact', () => {
  it('Experience is registered next to the existing models', () => {
    expect(models.Experience).toBeDefined();
    expect(models.Experience.modelName).toBe('Experience');
    for (const name of ['User', 'ChildProfile', 'ExploreContent', 'Course', 'KidsWallPost', 'ProgramPrintable', 'CmsBook', 'NotificationCampaign']) {
      expect(models[name]).toBeDefined();
    }
  });

  it('ExploreContent keeps the fields the Explore pages rely on', () => {
    const paths = Object.keys(models.ExploreContent.schema.paths);
    for (const field of ['title', 'description', 'type', 'videoType', 'videoFileUrl', 'coverImage', 'order', 'isPublished']) {
      expect(paths).toContain(field);
    }
  });

  it('the uuid is unique, never edited and a version 4 uuid by default', async () => {
    const a = new models.Experience({ title: 'A' });
    expect(a.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(models.Experience.schema.path('uuid').options.unique).toBe(true);
    expect(models.Experience.schema.path('uuid').options.immutable).toBe(true);
    await models.Experience.deleteMany({});
    const saved = await models.Experience.create({ title: 'B' });
    saved.uuid = '3b241101-e2bb-4255-8caf-4136c566a962';
    await saved.save();
    expect((await models.Experience.findById(saved._id)).uuid).not.toBe('3b241101-e2bb-4255-8caf-4136c566a962');
  });

  it('every video is numbered from 1 by the model itself, whichever way it is saved', async () => {
    const doc = await models.Experience.create({
      title: 'Numbered',
      videos: [
        { title: 'A', embedUrl: 'https://iframe.mediadelivery.net/embed/1/a' },
        { title: 'B', embedUrl: 'https://iframe.mediadelivery.net/embed/1/b' },
      ],
    });
    expect(doc.videos.map((v) => v.position)).toEqual([1, 2]);
    doc.videos.unshift({ title: 'First', embedUrl: 'https://iframe.mediadelivery.net/embed/1/first' });
    await doc.save();
    expect((await models.Experience.findById(doc._id)).videos.map((v) => `${v.position}:${v.title}`)).toEqual(['1:First', '2:A', '3:B']);
    doc.videos.splice(1, 1);
    await doc.save();
    expect((await models.Experience.findById(doc._id)).videos.map((v) => `${v.position}:${v.title}`)).toEqual(['1:First', '2:B']);
  });

  it('a video position can never be 0 or negative', async () => {
    const doc = new models.Experience({ title: 'x', videos: [{ title: 'A', embedUrl: 'https://iframe.mediadelivery.net/embed/1/a' }] });
    await doc.validate(); // fine: the model numbers it
    expect(models.Experience.schema.path('videos').schema.path('position').options.min[0]).toBe(1);
  });

  it('a new experience is a hidden draft with no videos until an admin says otherwise', async () => {
    const doc = await models.Experience.create({ title: 'Draft' });
    expect(doc).toMatchObject({ isPublished: false, order: 0, coverImage: null, description: '' });
    expect(doc.videos).toHaveLength(0);
    expect(doc.printable.button).toBe('Print here');
  });
});

describe('the new code follows the repo rules', () => {
  const files = [
    ['utils', 'experienceValidation.util.js'],
    ['models', 'Experience.js'],
    ['services', 'experienceAdmin.service.js'],
    ['controllers', 'experienceAdmin.controller.js'],
    ['routes', 'experienceAdmin.routes.js'],
    ['middleware', 'uploadExperience.js'],
  ];

  it.each(files)('%s/%s writes no raw console output (it uses the logger)', (...parts) => {
    expect(read(...parts)).not.toMatch(/console\.(log|warn|error|info|debug)\(/);
  });

  it('the admin routes are protected by the login and by the admin role before any route', () => {
    const layers = experienceAdminRoutes.stack;
    const firstRoute = layers.findIndex((l) => l.route);
    const names = layers.slice(0, firstRoute).map((l) => l.name);
    expect(names).toEqual(['protect', expect.any(String)]); // protect, then authorize(...)'s middleware
    expect(firstRoute).toBe(2);
  });

  it('the admin routes include everything the screen needs, and reorder comes before /:uuid', () => {
    const routes = experienceAdminRoutes.stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0]} ${l.route.path}`);
    expect(routes).toEqual([
      'get /',
      'post /',
      'post /reorder',
      'get /:uuid',
      'put /:uuid',
      'patch /:uuid/publish',
      'patch /:uuid/unpublish',
      'post /:uuid/videos/reorder',
      'patch /:uuid/videos/:videoId/position',
      'delete /:uuid',
    ]);
  });

  it('never gives the old environment links to the admin side (the two are separate)', () => {
    for (const parts of files) expect(read(...parts)).not.toMatch(/EXPERIENCE_VIDEOS_(PT|ES)/);
  });
});
