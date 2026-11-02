/**
 * /uploads: pictures are cached on the phone for 30 days (so a slow server is not asked again for
 * every cover each time a page opens); other files keep the default behaviour. Runs the real static
 * middleware over a temporary folder with supertest.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');

const { uploadsStatic, setUploadCacheHeaders, IMAGE_CACHE_SECONDS } = require('../middleware/uploadsStatic');

const THIRTY_DAYS = 30 * 24 * 60 * 60;

let root;
let app;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-test-'));
  fs.mkdirSync(path.join(root, 'courses'));
  for (const name of ['courses/a.png', 'courses/b.jpg', 'courses/c.JPEG', 'courses/d.webp', 'courses/e.gif']) {
    fs.writeFileSync(path.join(root, name), 'image-bytes');
  }
  for (const name of ['courses/doc.pdf', 'courses/sound.mp3', 'courses/notes.txt', 'courses/video.mp4']) {
    fs.writeFileSync(path.join(root, name), 'other-bytes');
  }
  app = express();
  app.use('/uploads', uploadsStatic(root));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('/uploads pictures', () => {
  it('has a 30-day cache lifetime', () => {
    expect(IMAGE_CACHE_SECONDS).toBe(THIRTY_DAYS);
  });

  it.each(['a.png', 'b.jpg', 'c.JPEG', 'd.webp', 'e.gif'])('%s is cached for 30 days', async (file) => {
    const res = await request(app).get(`/uploads/courses/${file}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(`public, max-age=${THIRTY_DAYS}`);
  });

  it('still sends a validator, so an expired copy can be refreshed with a cheap 304', async () => {
    const first = await request(app).get('/uploads/courses/a.png');
    expect(first.headers.etag).toBeTruthy();

    const second = await request(app).get('/uploads/courses/a.png').set('If-None-Match', first.headers.etag);
    expect(second.status).toBe(304);
  });
});

describe('/uploads other files', () => {
  it.each(['doc.pdf', 'sound.mp3', 'notes.txt', 'video.mp4'])('%s keeps the default cache behaviour', async (file) => {
    const res = await request(app).get(`/uploads/courses/${file}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=0');
  });

  it('a missing file is still a 404, with no long cache on the error', async () => {
    const res = await request(app).get('/uploads/courses/missing.png');

    expect(res.status).toBe(404);
    expect(res.headers['cache-control'] || '').not.toContain('max-age=2592000');
  });
});

describe('setUploadCacheHeaders', () => {
  const headersFor = (filePath) => {
    const set = jest.fn();
    setUploadCacheHeaders({ setHeader: set }, filePath);
    return set.mock.calls;
  };

  it('sets the header for pictures only, whatever the folder', () => {
    expect(headersFor('/srv/uploads/kids-wall/x.PNG')).toEqual([['Cache-Control', `public, max-age=${THIRTY_DAYS}`]]);
    expect(headersFor('/srv/uploads/courses/x.pdf')).toEqual([]);
    expect(headersFor('/srv/uploads/courses/png')).toEqual([]);
  });
});
