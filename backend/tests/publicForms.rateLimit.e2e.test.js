/**
 * RUK-SEC-022 — end-to-end: the unauthenticated public lead forms (/api/invitation and
 * /api/school-application) are per-IP rate limited by the real route files, and share one budget.
 *
 * Controllers are stubbed so we test the routing + middleware wiring, not Flodesk / the DB.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-022
 */
const ENV = { PUBLIC_FORM_MAX: '4', PUBLIC_FORM_WINDOW_MS: '60000' };
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}
afterAll(() => {
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

jest.mock('../controllers/invitationController', () => ({
  submitInvitation: (req, res) => res.status(201).json({ ok: 'invitation' }),
}));
jest.mock('../controllers/schoolApplicationController', () => ({
  submitSchoolApplication: (req, res) => res.status(201).json({ ok: 'school' }),
}));

const express = require('express');
const request = require('supertest');
const invitationRoutes = require('../routes/invitationRoutes');
const schoolApplicationRoutes = require('../routes/schoolApplicationRoutes');

function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/invitation', invitationRoutes);
  app.use('/api/school-application', schoolApplicationRoutes);
  return app;
}

let ipCounter = 0;
const nextIp = () => `198.51.100.${(ipCounter += 1)}`;

const post = (app, path, ip) => request(app).post(path).set('X-Forwarded-For', ip).send({});

describe('RUK-SEC-022 public-form rate limiting (e2e)', () => {
  it('POST /api/invitation: allows PUBLIC_FORM_MAX (4), then 429 with Retry-After', async () => {
    const app = buildApp();
    const ip = nextIp();

    for (let i = 0; i < 4; i += 1) {
      expect((await post(app, '/api/invitation', ip)).status).toBe(201);
    }
    const blocked = await post(app, '/api/invitation', ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('POST /api/school-application is limited the same way', async () => {
    const app = buildApp();
    const ip = nextIp();

    for (let i = 0; i < 4; i += 1) {
      expect((await post(app, '/api/school-application', ip)).status).toBe(201);
    }
    expect((await post(app, '/api/school-application', ip)).status).toBe(429);
  });

  it('the two forms SHARE one per-IP budget', async () => {
    const app = buildApp();
    const ip = nextIp();

    expect((await post(app, '/api/invitation', ip)).status).toBe(201);
    expect((await post(app, '/api/invitation', ip)).status).toBe(201);
    expect((await post(app, '/api/school-application', ip)).status).toBe(201);
    expect((await post(app, '/api/school-application', ip)).status).toBe(201); // 4 total = the budget
    expect((await post(app, '/api/school-application', ip)).status).toBe(429); // 5th, either form
    expect((await post(app, '/api/invitation', ip)).status).toBe(429);
  });

  it('a different client IP gets its own budget', async () => {
    const app = buildApp();
    const ipA = nextIp();
    const ipB = nextIp();

    for (let i = 0; i < 4; i += 1) await post(app, '/api/invitation', ipA);
    expect((await post(app, '/api/invitation', ipA)).status).toBe(429);

    for (let i = 0; i < 4; i += 1) {
      expect((await post(app, '/api/invitation', ipB)).status).toBe(201);
    }
  });
});
