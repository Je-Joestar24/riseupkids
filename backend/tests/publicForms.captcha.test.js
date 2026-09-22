/**
 * reCAPTCHA v3 gate on the two public lead-capture forms (/api/invitation and
 * /api/school-application) — a real prospective parent/school never sees a checkbox or puzzle
 * (the token is minted invisibly client-side), but a submission with a missing, invalid, or
 * low-scoring token is rejected before anything is created, and never surfaces the internal
 * verification reason to the caller.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 2 follow-up)
 */
// This file isn't testing rate limiting (see publicForms.rateLimit.e2e.test.js for that) — raise
// the shared per-IP budget so the several requests made here across tests don't trip it.
const ENV = { PUBLIC_FORM_MAX: '1000' };
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

jest.mock('../services/captcha.service', () => ({ verifyCaptcha: jest.fn() }));
jest.mock('../services/lead.services', () => ({ submitInvitationLead: jest.fn() }));
jest.mock('../services/schoolProspect.services', () => ({
  submitSchoolProspect: jest.fn(),
  normalizeLanguage: (v) => (['pt', 'en', 'es'].includes(v) ? v : null),
  normalizeRole: (v) => (['owner', 'principal', 'coordinator', 'teacher'].includes(v) ? v : null),
  normalizeCurrentEnglish: (v) => (['yes', 'no'].includes(v) ? v : null),
}));

const express = require('express');
const request = require('supertest');
const { verifyCaptcha } = require('../services/captcha.service');
const { submitInvitationLead } = require('../services/lead.services');
const { submitSchoolProspect } = require('../services/schoolProspect.services');
const invitationRoutes = require('../routes/invitationRoutes');
const schoolApplicationRoutes = require('../routes/schoolApplicationRoutes');

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  app.use('/api/invitation', invitationRoutes);
  app.use('/api/school-application', schoolApplicationRoutes);
  return app;
}

let app;
const VALID_INVITATION_BODY = {
  parentName: 'Test Parent',
  email: 'parent@example.com',
  whatsapp: '+15551234567',
  age: 7,
  language: 'en',
  consent: true,
  captchaToken: 'a-real-token',
};
const VALID_SCHOOL_BODY = {
  schoolName: 'Test School',
  cityCountry: 'Austin, USA',
  role: 'principal',
  whatsapp: '+15551234567',
  email: 'school@example.com',
  studentCount: '100',
  ageGroup: '6-10',
  currentEnglish: 'yes',
  interest: 'Curious about the program',
  language: 'en',
  captchaToken: 'a-real-token',
};

beforeEach(() => {
  jest.clearAllMocks();
  app = buildApp();
});

describe('POST /api/invitation — captcha gate', () => {
  it('verifies with the "invitation" action and proceeds when the token is valid', async () => {
    verifyCaptcha.mockResolvedValue({ verified: true, score: 0.9, reason: null });
    submitInvitationLead.mockResolvedValue({ flodesk: { id: 'sub-1' } });

    const res = await request(app).post('/api/invitation').send(VALID_INVITATION_BODY);

    expect(verifyCaptcha).toHaveBeenCalledWith('a-real-token', 'invitation');
    expect(submitInvitationLead).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects and never creates a lead when the token is missing', async () => {
    verifyCaptcha.mockResolvedValue({ verified: false, score: null, reason: 'missing_token' });

    const { captchaToken, ...bodyWithoutToken } = VALID_INVITATION_BODY;
    const res = await request(app).post('/api/invitation').send(bodyWithoutToken);

    expect(submitInvitationLead).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Verification failed. Please try again.' });
  });

  it('rejects and never creates a lead when the score is too low (likely a bot)', async () => {
    verifyCaptcha.mockResolvedValue({ verified: false, score: 0.1, reason: 'low_score' });

    const res = await request(app).post('/api/invitation').send(VALID_INVITATION_BODY);

    expect(submitInvitationLead).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  it('never leaks the internal verification reason to the response body', async () => {
    verifyCaptcha.mockResolvedValue({ verified: false, score: null, reason: 'RECAPTCHA_SECRET_KEY is not configured' });

    const res = await request(app).post('/api/invitation').send(VALID_INVITATION_BODY);

    expect(JSON.stringify(res.body)).not.toContain('RECAPTCHA_SECRET_KEY');
    expect(res.body.message).toBe('Verification failed. Please try again.');
  });

  it('fails closed when the captcha verification service itself throws unexpectedly', async () => {
    verifyCaptcha.mockRejectedValue(new Error('unexpected'));

    const res = await request(app).post('/api/invitation').send(VALID_INVITATION_BODY);

    expect(submitInvitationLead).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  it('still validates ordinary required fields before ever calling captcha verification', async () => {
    const { parentName, ...bodyWithoutName } = VALID_INVITATION_BODY;

    const res = await request(app).post('/api/invitation').send(bodyWithoutName);

    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/parentName/i);
  });
});

describe('POST /api/school-application — captcha gate', () => {
  it('verifies with the "school_application" action and proceeds when the token is valid', async () => {
    verifyCaptcha.mockResolvedValue({ verified: true, score: 0.9, reason: null });
    submitSchoolProspect.mockResolvedValue({ flodesk: { id: 'sub-2', email: 'school@example.com' } });

    const res = await request(app).post('/api/school-application').send(VALID_SCHOOL_BODY);

    expect(verifyCaptcha).toHaveBeenCalledWith('a-real-token', 'school_application');
    expect(submitSchoolProspect).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects and never creates a school prospect when the token is missing', async () => {
    verifyCaptcha.mockResolvedValue({ verified: false, score: null, reason: 'missing_token' });

    const { captchaToken, ...bodyWithoutToken } = VALID_SCHOOL_BODY;
    const res = await request(app).post('/api/school-application').send(bodyWithoutToken);

    expect(submitSchoolProspect).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Verification failed. Please try again.' });
  });

  it("a token minted for the OTHER form's action is rejected (action_mismatch)", async () => {
    verifyCaptcha.mockResolvedValue({ verified: false, score: 0.9, reason: 'action_mismatch' });

    const res = await request(app).post('/api/school-application').send(VALID_SCHOOL_BODY);

    expect(submitSchoolProspect).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });
});
