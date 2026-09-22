/**
 * reCAPTCHA v3 server-side verification, for the two public lead-capture forms. This check FAILS
 * CLOSED on every non-success path (unlike hibp.service.js's breach check, which fails open) —
 * a bot check that silently passes when unreachable defeats its own purpose.
 */
jest.mock('axios');
const axios = require('axios');
const { verifyCaptcha, getScoreThreshold } = require('../services/captcha.service');

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RECAPTCHA_SECRET_KEY = 'test-secret-key';
  delete process.env.RECAPTCHA_SCORE_THRESHOLD;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('verifyCaptcha — fails closed', () => {
  it('rejects when RECAPTCHA_SECRET_KEY is not configured, without calling the API', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;

    const result = await verifyCaptcha('some-token', 'invitation');

    expect(result).toEqual({ verified: false, score: null, reason: 'not_configured' });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects a missing/empty token without calling the API', async () => {
    expect(await verifyCaptcha('', 'invitation')).toEqual({
      verified: false,
      score: null,
      reason: 'missing_token',
    });
    expect(await verifyCaptcha(undefined, 'invitation')).toEqual({
      verified: false,
      score: null,
      reason: 'missing_token',
    });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects when the verify request itself fails (network error/timeout) — never fails open', async () => {
    axios.post.mockRejectedValue(new Error('timeout of 5000ms exceeded'));

    const result = await verifyCaptcha('a-real-token', 'invitation');

    expect(result).toEqual({ verified: false, score: null, reason: 'verification_request_failed' });
  });

  it('rejects when Google reports success: false', async () => {
    axios.post.mockResolvedValue({ data: { success: false, 'error-codes': ['timeout-or-duplicate'] } });

    const result = await verifyCaptcha('a-real-token', 'invitation');

    expect(result).toEqual({ verified: false, score: null, reason: 'timeout-or-duplicate' });
  });

  it('rejects a score below the threshold (default 0.5)', async () => {
    axios.post.mockResolvedValue({ data: { success: true, score: 0.3, action: 'invitation' } });

    const result = await verifyCaptcha('a-real-token', 'invitation');

    expect(result).toEqual({ verified: false, score: 0.3, reason: 'low_score' });
  });

  it('rejects when the action does not match the expected one (a token minted for a different form)', async () => {
    axios.post.mockResolvedValue({ data: { success: true, score: 0.9, action: 'school_application' } });

    const result = await verifyCaptcha('a-real-token', 'invitation');

    expect(result).toEqual({ verified: false, score: 0.9, reason: 'action_mismatch' });
  });

  it('honors RECAPTCHA_SCORE_THRESHOLD when set', async () => {
    process.env.RECAPTCHA_SCORE_THRESHOLD = '0.9';
    axios.post.mockResolvedValue({ data: { success: true, score: 0.7, action: 'invitation' } });

    const result = await verifyCaptcha('a-real-token', 'invitation');

    expect(result).toEqual({ verified: false, score: 0.7, reason: 'low_score' });
  });
});

describe('verifyCaptcha — accepts a genuinely valid submission', () => {
  it('verifies successfully when score meets the threshold and the action matches', async () => {
    axios.post.mockResolvedValue({ data: { success: true, score: 0.9, action: 'invitation' } });

    const result = await verifyCaptcha('a-real-token', 'invitation');

    expect(result).toEqual({ verified: true, score: 0.9, reason: null });
  });

  it('does not require expectedAction to be passed', async () => {
    axios.post.mockResolvedValue({ data: { success: true, score: 0.8, action: 'anything' } });

    const result = await verifyCaptcha('a-real-token');

    expect(result).toEqual({ verified: true, score: 0.8, reason: null });
  });
});

describe('verifyCaptcha — request shape', () => {
  it('posts the secret and token as form-encoded body, never the secret in the URL', async () => {
    axios.post.mockResolvedValue({ data: { success: true, score: 0.9, action: 'invitation' } });

    await verifyCaptcha('  a-real-token  ', 'invitation');

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = axios.post.mock.calls[0];
    expect(url).toBe('https://www.google.com/recaptcha/api/siteverify');
    expect(url).not.toContain('test-secret-key');
    expect(body).toContain('secret=test-secret-key');
    expect(body).toContain('response=a-real-token');
    expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });
});

describe('getScoreThreshold', () => {
  it('defaults to 0.5', () => {
    expect(getScoreThreshold()).toBe(0.5);
  });

  it('uses a valid configured value', () => {
    process.env.RECAPTCHA_SCORE_THRESHOLD = '0.7';
    expect(getScoreThreshold()).toBe(0.7);
  });

  it('falls back to the default for an out-of-range or invalid value', () => {
    process.env.RECAPTCHA_SCORE_THRESHOLD = '1.5';
    expect(getScoreThreshold()).toBe(0.5);
    process.env.RECAPTCHA_SCORE_THRESHOLD = 'not-a-number';
    expect(getScoreThreshold()).toBe(0.5);
  });
});
