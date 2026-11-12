/**
 * The exact requests the admin add / edit form sends (frontend: utils/experienceForm.js `buildFormData`),
 * played against the real routes, service, model and database. If the form and the server ever disagree about
 * the shape of a request, this is where it shows.
 *
 * What the form sends: multipart with `title`, `description`, `isPublished` ("true" / "false"), `videos` and
 * `printable` as JSON text, optional `coverImage` / `printableImage` files, `removeCoverImage` /
 * `removePrintableImage` ("true"), and on an edit the `expectedUpdatedAt` it loaded. A saved video carries its
 * `id`; a new one does not; no row ever carries a `position`.
 */
const ENV = {
  JWT_SECRET: 'e2e-experience-form-secret-long-enough-1234567890',
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
const V3 = 'https://iframe.mediadelivery.net/embed/660084/video-three';
const V4 = 'https://iframe.mediadelivery.net/embed/660084/video-four';
const GOOD_PASSWORD = 'CorrectHorse42';

let mongod;
let app;
let adminToken;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Experience.init();

  app = express();
  app.set('trust proxy', false);
  app.use(requestId);
  app.use(express.json());
  app.use(BASE, experienceAdminRoutes);
  app.use(errorHandler);

  const admin = await User.create({ name: 'admin', email: 'admin@example.com', password: GOOD_PASSWORD, role: 'admin', twoFactorEnabled: true });
  adminToken = jwt.sign({ id: admin._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
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

const png = (size = 16) => Buffer.alloc(size, 1);

/** A request built the way the form builds it: the same fields, and the same text for each value. */
const formRequest = (
  method,
  path,
  { title = 'Strawberry', description = '', isPublished = false, videos = [], printable = { link: '', button: '' }, expectedUpdatedAt, files = {}, removeCover, removePrintable } = {}
) => {
  let req = request(app)[method](path)
    .set('Authorization', `Bearer ${adminToken}`)
    .field('title', title)
    .field('description', description)
    .field('isPublished', String(isPublished))
    .field('videos', JSON.stringify(videos))
    .field('printable', JSON.stringify(printable));
  if (files.cover) req = req.attach('coverImage', png(), { filename: 'cover.png', contentType: 'image/png' });
  if (files.printable) req = req.attach('printableImage', png(), { filename: 'print.webp', contentType: 'image/webp' });
  if (removeCover) req = req.field('removeCoverImage', 'true');
  if (removePrintable) req = req.field('removePrintableImage', 'true');
  if (expectedUpdatedAt) req = req.field('expectedUpdatedAt', expectedUpdatedAt);
  return req;
};

const create = (fields) => formRequest('post', BASE, fields);
const save = (uuid, fields) => formRequest('put', `${BASE}/${uuid}`, fields);

describe('creating from the form', () => {
  it('a draft with only a title: empty description, no videos, empty printable', async () => {
    const res = await create({ title: 'Just a title' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'Just a title',
      description: '',
      isPublished: false,
      videos: [],
      coverImage: null,
      printable: { image: null, link: '', button: 'Print here' },
    });
  });

  it('everything at once: videos in order (no ids, no positions sent), printable, both pictures, published', async () => {
    const res = await create({
      title: '  Strawberry Banana Smoothie  ',
      description: 'Make a smoothie',
      isPublished: true,
      videos: [
        { title: 'Vocabulary', embedUrl: V1 },
        { title: 'The story', embedUrl: V2 },
      ],
      printable: { link: 'https://riseup.kids/downloads/recipe.pdf', button: 'Print recipe here' },
      files: { cover: true, printable: true },
    });
    expect(res.status).toBe(201);
    const { data } = res.body;
    expect(data.title).toBe('Strawberry Banana Smoothie');
    expect(data.isPublished).toBe(true);
    expect(data.videos.map((video) => [video.title, video.position])).toEqual([['Vocabulary', 1], ['The story', 2]]);
    data.videos.forEach((video) => expect(video.id).toMatch(/^[0-9a-f]{24}$/));
    expect(data.coverImage).toMatch(/^https:\/\/cdn\.test\//);
    expect(data.printable).toMatchObject({ link: 'https://riseup.kids/downloads/recipe.pdf', button: 'Print recipe here' });
    expect(data.printable.image).toMatch(/^https:\/\/cdn\.test\//);
  });

  it('a player link is saved as the embed link', async () => {
    const res = await create({ videos: [{ title: 'One', embedUrl: 'https://player.mediadelivery.net/embed/660084/video-one' }] });
    expect(res.status).toBe(201);
    expect(res.body.data.videos[0].embedUrl).toBe(V1);
  });

  it('a published experience without a video is refused with the reason the form shows', async () => {
    const res = await create({ isPublished: true });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PUBLISH_BLOCKED');
    expect(res.body.errors).toEqual([{ field: 'videos', message: 'Add at least one video before publishing.' }]);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('the server names each field the way the form places it', async () => {
    const res = await create({
      title: '',
      description: 'a'.repeat(1001),
      videos: [{ title: '', embedUrl: 'https://example.com/x' }],
      printable: { link: 'https://example.com/a.pdf', button: 'a'.repeat(61) },
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors.map((error) => error.field).sort()).toEqual(
      ['description', 'printable.button', 'printable.link', 'title', 'videos[0].embedUrl', 'videos[0].title'].sort()
    );
  });

  it('says the same things the form says before sending, so a problem reads the same wherever it is found', async () => {
    const res = await create({ title: 'a'.repeat(201), description: 'a'.repeat(1001), printable: { link: 'http://riseup.kids/a.pdf', button: '' } });
    const byField = Object.fromEntries(res.body.errors.map((error) => [error.field, error.message]));
    expect(byField.title).toBe('Title cannot exceed 200 characters.');
    expect(byField.description).toBe('Description cannot exceed 1000 characters.');
    expect(byField['printable.link']).toBe('Printable link must use https.');
  });

  it('20 videos are accepted and 21 are refused', async () => {
    const many = (count) => Array.from({ length: count }, (_, i) => ({ title: `V${i}`, embedUrl: `https://iframe.mediadelivery.net/embed/660084/v${i}` }));
    expect((await create({ videos: many(20) })).status).toBe(201);
    const refused = await create({ videos: many(21) });
    expect(refused.status).toBe(400);
    expect(refused.body.errors).toEqual([{ field: 'videos', message: 'An experience can have at most 20 videos.' }]);
  });

  it('a second video with the same link is refused on that row', async () => {
    const res = await create({
      videos: [
        { title: 'One', embedUrl: V1 },
        { title: 'Two', embedUrl: 'https://player.mediadelivery.net/embed/660084/video-one' },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ field: 'videos[1].embedUrl', message: 'This video is already in the list (video 1).' }]);
  });
});

describe('saving an edit from the form', () => {
  let created;
  beforeEach(async () => {
    const res = await create({
      title: 'Original',
      description: 'Text',
      videos: [
        { title: 'One', embedUrl: V1 },
        { title: 'Two', embedUrl: V2 },
        { title: 'Three', embedUrl: V3 },
      ],
      printable: { link: 'https://riseup.kids/a.pdf', button: 'Print' },
      files: { cover: true, printable: true },
    });
    created = res.body.data;
  });

  const rows = (experience) => experience.videos.map(({ id, title, embedUrl }) => ({ id, title, embedUrl }));

  it('saving with nothing changed is accepted and keeps every video and picture', async () => {
    const res = await save(created.uuid, {
      title: created.title,
      description: created.description,
      videos: rows(created),
      printable: { link: created.printable.link, button: created.printable.button },
      expectedUpdatedAt: created.updatedAt,
    });
    expect(res.status).toBe(200);
    expect(rows(res.body.data)).toEqual(rows(created));
    expect(res.body.data.coverImage).toBe(created.coverImage);
    expect(res.body.data.printable.image).toBe(created.printable.image);
  });

  it('videos sent in a new order keep their ids and get new positions', async () => {
    const [one, two, three] = rows(created);
    const res = await save(created.uuid, { title: created.title, videos: [three, one, two], expectedUpdatedAt: created.updatedAt });
    expect(res.status).toBe(200);
    expect(res.body.data.videos.map((video) => [video.id, video.position])).toEqual([
      [three.id, 1],
      [one.id, 2],
      [two.id, 3],
    ]);
  });

  it('a removed video is gone and the rest are renumbered; a new one (no id) gets an id of its own', async () => {
    const [one, , three] = rows(created);
    const res = await save(created.uuid, {
      title: created.title,
      videos: [one, three, { title: 'Four', embedUrl: V4 }],
      expectedUpdatedAt: created.updatedAt,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.videos.map((video) => [video.title, video.position])).toEqual([['One', 1], ['Three', 2], ['Four', 3]]);
    expect(res.body.data.videos[0].id).toBe(one.id);
    expect(res.body.data.videos[2].id).toMatch(/^[0-9a-f]{24}$/);
    expect([one.id, three.id]).not.toContain(res.body.data.videos[2].id);
  });

  it('an empty printable clears the link, keeps the default button text, and leaves its picture', async () => {
    const res = await save(created.uuid, { title: created.title, videos: rows(created), printable: { link: '', button: '' }, expectedUpdatedAt: created.updatedAt });
    expect(res.status).toBe(200);
    expect(res.body.data.printable).toMatchObject({ link: '', button: 'Print here' });
    expect(res.body.data.printable.image).toBe(created.printable.image);
  });

  it('removing the cover and the printable picture deletes both stored pictures', async () => {
    const res = await save(created.uuid, { title: created.title, videos: rows(created), removeCover: true, removePrintable: true, expectedUpdatedAt: created.updatedAt });
    expect(res.status).toBe(200);
    expect(res.body.data.coverImage).toBeNull();
    expect(res.body.data.printable.image).toBeNull();
    expect(s3.deleteByKey).toHaveBeenCalledTimes(2);
  });

  it('a new cover replaces the old one, and the old one is deleted', async () => {
    const res = await save(created.uuid, { title: created.title, videos: rows(created), files: { cover: true }, expectedUpdatedAt: created.updatedAt });
    expect(res.status).toBe(200);
    expect(res.body.data.coverImage).not.toBe(created.coverImage);
    expect(s3.deleteByKey).toHaveBeenCalledTimes(1);
  });

  it('publishing and then hiding', async () => {
    const published = await save(created.uuid, { title: created.title, videos: rows(created), isPublished: true, expectedUpdatedAt: created.updatedAt });
    expect(published.body.data.isPublished).toBe(true);
    const hidden = await save(created.uuid, { title: created.title, videos: rows(created), isPublished: false, expectedUpdatedAt: published.body.data.updatedAt });
    expect(hidden.body.data.isPublished).toBe(false);
    expect(hidden.body.data.publishedAt).toBeNull();
  });

  it('removing every video of a published experience is refused', async () => {
    const published = await save(created.uuid, { title: created.title, videos: rows(created), isPublished: true, expectedUpdatedAt: created.updatedAt });
    const res = await save(created.uuid, { title: created.title, videos: [], isPublished: true, expectedUpdatedAt: published.body.data.updatedAt });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PUBLISH_BLOCKED');
  });

  it('someone else saved first: the edit is refused, and "save mine anyway" (no expectedUpdatedAt) goes through', async () => {
    const theirs = await save(created.uuid, { title: 'Theirs', videos: rows(created), expectedUpdatedAt: created.updatedAt });
    expect(theirs.status).toBe(200);

    const mine = await save(created.uuid, { title: 'Mine', videos: rows(created), expectedUpdatedAt: created.updatedAt });
    expect(mine.status).toBe(409);
    expect(mine.body.code).toBe('EXPERIENCE_CONFLICT');
    expect((await Experience.findOne({ uuid: created.uuid })).title).toBe('Theirs');

    const anyway = await save(created.uuid, { title: 'Mine', videos: rows(created) });
    expect(anyway.status).toBe(200);
    expect(anyway.body.data.title).toBe('Mine');
  });

  it('an experience deleted meanwhile is a 404 the form can answer', async () => {
    await request(app).delete(`${BASE}/${created.uuid}`).set('Authorization', `Bearer ${adminToken}`);
    const res = await save(created.uuid, { title: 'Late', videos: [], expectedUpdatedAt: created.updatedAt });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXPERIENCE_NOT_FOUND');
  });

  it('the experience the form loads has everything it needs to send back', async () => {
    const res = await request(app).get(`${BASE}/${created.uuid}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Object.keys(res.body.data).sort()).toEqual(
      ['coverImage', 'createdAt', 'description', 'isPublished', 'order', 'printable', 'publishedAt', 'title', 'updatedAt', 'uuid', 'videos'].sort()
    );
    expect(Object.keys(res.body.data.videos[0]).sort()).toEqual(['embedUrl', 'id', 'position', 'title']);
    expect(Object.keys(res.body.data.printable).sort()).toEqual(['button', 'image', 'link']);
  });
});
