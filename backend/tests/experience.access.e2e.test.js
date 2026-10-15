/**
 * End-to-end over real HTTP for the free Smoothie Experience page (/api/experience): the real
 * routes, controller, access service and Flodesk service run together. Only the network edges are
 * faked — axios (Flodesk) and the reCAPTCHA verifier.
 *
 * The properties that matter most:
 *  - an email that is not a confirmed freebie subscriber never receives the video links;
 *  - the links come only from the server, after the check — never from any other response;
 *  - a bot (failed reCAPTCHA) never reaches Flodesk at all;
 *  - a Flodesk outage is reported as "try again", not as "you are not registered".
 */
const ENV = {
  JWT_SECRET: 'e2e-experience-secret-long-enough-1234567890',
  FLODESK_API_KEY: 'e2e-flodesk-key',
  FLODESK_FREEBIE_SEGMENT_PT: 'seg-pt',
  FLODESK_FREEBIE_SEGMENT_ES: 'seg-es',
  EXPERIENCE_VIDEOS_PT:
    'https://player.mediadelivery.net/embed/660084/video-one,https://player.mediadelivery.net/embed/660084/video-two',
  EXPERIENCE_ACCESS_MAX: '100000',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}
delete process.env.EXPERIENCE_VIDEOS_ES;

jest.mock('axios');
jest.mock('../services/captcha.service', () => ({ verifyCaptcha: jest.fn() }));

const express = require('express');
const request = require('supertest');
const axios = require('axios');
const { verifyCaptcha } = require('../services/captcha.service');
const experienceRoutes = require('../routes/experienceRoutes');

const VIDEO_HOST = 'mediadelivery';

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  app.use('/api/experience', experienceRoutes);
  return app;
}

let app;

beforeAll(() => {
  app = buildApp();
});

afterAll(() => {
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  verifyCaptcha.mockResolvedValue({ verified: true, score: 0.9, reason: null });
});

const verify = (body) =>
  request(app)
    .post('/api/experience/verify')
    .send({ email: 'parent@example.com', language: 'pt', captchaToken: 'tok', ...body });

describe('POST /api/experience/verify — who gets in', () => {
  it('a confirmed subscriber in the freebie segment gets the videos and a device token', async () => {
    axios.get.mockResolvedValue({
      data: { id: 's1', status: 'active', segments: [{ id: 'seg-pt', name: 'FREEBIE — PT-BR' }] },
    });

    const res = await verify();

    expect(res.status).toBe(200);
    expect(res.body.data.videos).toEqual([
      'https://player.mediadelivery.net/embed/660084/video-one',
      'https://player.mediadelivery.net/embed/660084/video-two',
    ]);
    expect(typeof res.body.data.token).toBe('string');
    expect(verifyCaptcha).toHaveBeenCalledWith('tok', 'experience_access');
  });

  it('the email is looked up lowercased and trimmed', async () => {
    axios.get.mockResolvedValue({ data: { status: 'active', segments: [{ id: 'seg-pt' }] } });

    await verify({ email: '  Parent@Example.COM ' });

    expect(axios.get.mock.calls[0][0]).toMatch(/\/subscribers\/parent@example\.com$/);
  });

  it.each([
    ['not in Flodesk at all', Object.assign(new Error('nf'), { response: { status: 404 } })],
  ])('%s -> 403 and NO video links anywhere in the response', async (_label, error) => {
    axios.get.mockRejectedValue(error);

    const res = await verify({ email: 'nobody@example.com' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EXPERIENCE_ACCESS_DENIED');
    expect(JSON.stringify(res.body)).not.toContain(VIDEO_HOST);
    expect(res.body.data).toBeUndefined();
  });

  it.each([
    ['unconfirmed', { status: 'unconfirmed', segments: [{ id: 'seg-pt' }] }],
    ['unsubscribed', { status: 'unsubscribed', segments: [{ id: 'seg-pt' }] }],
    ['active but in a different segment', { status: 'active', segments: [{ id: 'newsletter' }] }],
  ])('a subscriber who is %s -> 403 and no video links', async (_label, subscriber) => {
    axios.get.mockResolvedValue({ data: subscriber });

    const res = await verify();

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain(VIDEO_HOST);
  });

  it('every kind of "no" gets the identical response, so they cannot be told apart', async () => {
    const bodies = [];
    for (const subscriber of [
      { status: 'unconfirmed', segments: [{ id: 'seg-pt' }] },
      { status: 'active', segments: [] },
    ]) {
      axios.get.mockResolvedValueOnce({ data: subscriber });
      bodies.push((await verify()).body);
    }
    axios.get.mockRejectedValueOnce(Object.assign(new Error('nf'), { response: { status: 404 } }));
    bodies.push((await verify()).body);

    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
  });

  it('the Spanish page checks the Spanish segment, not the Portuguese one', async () => {
    axios.get.mockResolvedValue({ data: { status: 'active', segments: [{ id: 'seg-pt' }] } });
    expect((await verify({ language: 'es' })).status).toBe(403);

    axios.get.mockResolvedValue({ data: { status: 'active', segments: [{ id: 'seg-es' }] } });
    const ok = await verify({ language: 'es' });
    expect(ok.status).toBe(200);
    // No Spanish list configured -> falls back to the Portuguese links.
    expect(ok.body.data.videos).toHaveLength(2);
  });
});

describe('POST /api/experience/verify — abuse and failure handling', () => {
  it('a failed reCAPTCHA is rejected BEFORE Flodesk is ever called', async () => {
    verifyCaptcha.mockResolvedValue({ verified: false, score: 0.1, reason: 'low_score' });

    const res = await verify();

    expect(res.status).toBe(400);
    expect(axios.get).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('low_score');
    expect(JSON.stringify(res.body)).not.toContain(VIDEO_HOST);
  });

  it('a missing or malformed email is rejected without calling reCAPTCHA or Flodesk', async () => {
    for (const email of [undefined, '', 'nope', { $ne: '' }, ['a@b.co']]) {
      const res = await verify({ email });
      expect(res.status).toBe(400);
    }

    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('a Flodesk outage is "try again" (503) — never "you are not registered"', async () => {
    axios.get.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500 } }));

    const res = await verify();

    expect(res.status).toBe(503);
    expect(res.body.code).not.toBe('EXPERIENCE_ACCESS_DENIED');
    expect(JSON.stringify(res.body)).not.toContain(VIDEO_HOST);
  });

  it('a missing segment setting is reported as a temporary failure, with no setting names leaked', async () => {
    const saved = process.env.FLODESK_FREEBIE_SEGMENT_ES;
    delete process.env.FLODESK_FREEBIE_SEGMENT_ES;

    const res = await verify({ language: 'es' });

    process.env.FLODESK_FREEBIE_SEGMENT_ES = saved;
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('FLODESK');
  });
});

describe('POST /api/experience/session — staying unlocked on the same device', () => {
  async function unlockedToken(language = 'pt') {
    axios.get.mockResolvedValue({
      data: { status: 'active', segments: [{ id: language === 'es' ? 'seg-es' : 'seg-pt' }] },
    });
    return (await verify({ language })).body.data.token;
  }

  it('a token from a successful check re-opens the page without the email', async () => {
    const token = await unlockedToken('pt');
    axios.get.mockClear();

    const res = await request(app).post('/api/experience/session').send({ token, language: 'pt' });

    expect(res.status).toBe(200);
    expect(res.body.data.videos).toHaveLength(2);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('a token for one language does not open the other language page', async () => {
    const token = await unlockedToken('pt');

    const res = await request(app).post('/api/experience/session').send({ token, language: 'es' });

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain(VIDEO_HOST);
  });

  it.each([undefined, '', 'garbage', 'a.b.c', 12345, { x: 1 }])(
    'a missing or invalid token (%p) gets nothing',
    async (token) => {
      const res = await request(app).post('/api/experience/session').send({ token, language: 'pt' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EXPERIENCE_TOKEN_INVALID');
      expect(JSON.stringify(res.body)).not.toContain(VIDEO_HOST);
    }
  );

  it('the page link cannot unlock anything: no URL or query parameter is read', async () => {
    const res = await request(app)
      .post('/api/experience/session?token=anything&email=parent@example.com&unlocked=1')
      .send({ language: 'pt' });

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain(VIDEO_HOST);
  });

  it('a login (session) token can never be used to unlock the page', async () => {
    const jwt = require('jsonwebtoken');
    const loginToken = jwt.sign({ id: 'someone', tokenVersion: 0 }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    const res = await request(app)
      .post('/api/experience/session')
      .send({ token: loginToken, language: 'pt' });

    expect(res.status).toBe(403);
  });
});

describe('GET on these paths', () => {
  it('there is no way to read the videos with a plain GET', async () => {
    expect((await request(app).get('/api/experience/verify')).status).toBe(404);
    expect((await request(app).get('/api/experience/session')).status).toBe(404);
    expect((await request(app).get('/api/experience/videos')).status).toBe(404);
  });
});
