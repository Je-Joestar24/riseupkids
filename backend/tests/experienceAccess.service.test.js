/**
 * Access rules for the free Smoothie Experience page: who gets in, how a device stays unlocked,
 * and which video links are ever handed out.
 */
jest.mock('../services/flodeskService', () => ({
  getSubscriberByEmail: jest.fn(),
  getFreebieSegmentId: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const { getSubscriberByEmail, getFreebieSegmentId } = require('../services/flodeskService');
const {
  normalizeExperienceLanguage,
  normalizeEmail,
  issueExperienceToken,
  verifyExperienceToken,
  emailHasExperienceAccess,
  getExperienceVideos,
} = require('../services/experienceAccess.service');

const ROOT_SECRET = 'unit-test-root-secret-long-enough-1234567890';
const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, JWT_SECRET: ROOT_SECRET };
  delete process.env.EXPERIENCE_VIDEOS_PT;
  delete process.env.EXPERIENCE_VIDEOS_ES;
  delete process.env.EXPERIENCE_TOKEN_EXPIRE;
  getFreebieSegmentId.mockReturnValue('seg-freebie');
});

afterAll(() => {
  process.env = originalEnv;
});

describe('normalizeExperienceLanguage / normalizeEmail', () => {
  it('only Spanish is Spanish; everything else is Portuguese (the site default)', () => {
    expect(normalizeExperienceLanguage('es')).toBe('es');
    expect(normalizeExperienceLanguage(' ES ')).toBe('es');
    expect(normalizeExperienceLanguage('pt')).toBe('pt');
    expect(normalizeExperienceLanguage('en')).toBe('pt');
    expect(normalizeExperienceLanguage(undefined)).toBe('pt');
  });

  it('lowercases and trims a valid email, and rejects anything else', () => {
    expect(normalizeEmail('  Maria@Example.COM ')).toBe('maria@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail({ $ne: '' })).toBeNull();
    expect(normalizeEmail(`${'a'.repeat(250)}@example.com`)).toBeNull();
  });
});

describe('emailHasExperienceAccess', () => {
  it('is true for a confirmed (active) subscriber in the freebie segment', async () => {
    getSubscriberByEmail.mockResolvedValue({
      status: 'active',
      segments: [{ id: 'other' }, { id: 'seg-freebie' }],
    });

    await expect(emailHasExperienceAccess('a@example.com', 'pt')).resolves.toBe(true);
    expect(getFreebieSegmentId).toHaveBeenCalledWith('pt');
  });

  it('looks up the segment for the page language', async () => {
    getSubscriberByEmail.mockResolvedValue({ status: 'active', segments: [{ id: 'seg-freebie' }] });

    await emailHasExperienceAccess('a@example.com', 'es');

    expect(getFreebieSegmentId).toHaveBeenCalledWith('es');
  });

  it.each(['unconfirmed', 'unsubscribed', 'bounced', 'complained', 'cleaned', undefined])(
    'is false when the subscriber status is %s (not confirmed/active)',
    async (status) => {
      getSubscriberByEmail.mockResolvedValue({ status, segments: [{ id: 'seg-freebie' }] });

      await expect(emailHasExperienceAccess('a@example.com', 'pt')).resolves.toBe(false);
    }
  );

  it('is false for an active subscriber who is NOT in the freebie segment', async () => {
    getSubscriberByEmail.mockResolvedValue({ status: 'active', segments: [{ id: 'other' }] });

    await expect(emailHasExperienceAccess('a@example.com', 'pt')).resolves.toBe(false);
  });

  it('is false when the subscriber has no segments at all', async () => {
    getSubscriberByEmail.mockResolvedValue({ status: 'active' });

    await expect(emailHasExperienceAccess('a@example.com', 'pt')).resolves.toBe(false);
  });

  it('is false when Flodesk has no subscriber with that email', async () => {
    getSubscriberByEmail.mockResolvedValue(null);

    await expect(emailHasExperienceAccess('nobody@example.com', 'pt')).resolves.toBe(false);
  });

  it('throws (never answers "no") when the check could not be performed', async () => {
    getSubscriberByEmail.mockRejectedValue(new Error('Flodesk subscriber lookup failed'));
    await expect(emailHasExperienceAccess('a@example.com', 'pt')).rejects.toThrow();

    getFreebieSegmentId.mockImplementation(() => {
      throw new Error('FLODESK_FREEBIE_SEGMENT_ES environment variable is not set');
    });
    await expect(emailHasExperienceAccess('a@example.com', 'es')).rejects.toThrow(/not set/);
  });
});

describe('device token', () => {
  it('verifies for the language it was issued for', () => {
    const token = issueExperienceToken('pt');

    expect(verifyExperienceToken(token, 'pt')).toBe(true);
  });

  it('does not unlock the OTHER language page', () => {
    expect(verifyExperienceToken(issueExperienceToken('pt'), 'es')).toBe(false);
    expect(verifyExperienceToken(issueExperienceToken('es'), 'pt')).toBe(false);
  });

  it('carries no personal data — no email, no id', () => {
    const decoded = jwt.decode(issueExperienceToken('pt'));

    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'lang', 'purpose']);
  });

  it('rejects a missing, malformed, or tampered token', () => {
    expect(verifyExperienceToken(undefined, 'pt')).toBe(false);
    expect(verifyExperienceToken('', 'pt')).toBe(false);
    expect(verifyExperienceToken('not.a.jwt', 'pt')).toBe(false);
    expect(verifyExperienceToken(`${issueExperienceToken('pt')}x`, 'pt')).toBe(false);
  });

  it('rejects an expired token', () => {
    process.env.EXPERIENCE_TOKEN_EXPIRE = '-1s';

    expect(verifyExperienceToken(issueExperienceToken('pt'), 'pt')).toBe(false);
  });

  it('a token signed with the raw login secret is NOT accepted as page access', () => {
    const forged = jwt.sign({ purpose: 'experience', lang: 'pt' }, ROOT_SECRET, { expiresIn: '1h' });

    expect(verifyExperienceToken(forged, 'pt')).toBe(false);
  });

  it('a page-access token is NOT a valid login token', () => {
    const token = issueExperienceToken('pt');

    expect(() => jwt.verify(token, ROOT_SECRET)).toThrow();
  });

  it('a token for some other purpose, even correctly signed, is rejected', () => {
    // Same derived secret as the real tokens, different purpose claim.
    const crypto = require('crypto');
    const secret = crypto.createHmac('sha256', ROOT_SECRET).update('experience-access-v1').digest('hex');
    const otherPurpose = jwt.sign({ purpose: 'something-else', lang: 'pt' }, secret, { expiresIn: '1h' });

    expect(verifyExperienceToken(otherPurpose, 'pt')).toBe(false);
  });
});

describe('getExperienceVideos', () => {
  const V1 = 'https://player.mediadelivery.net/embed/660084/aaa';
  const V2 = 'https://iframe.mediadelivery.net/embed/660084/bbb';

  it('returns the configured links, trimmed, in order', () => {
    process.env.EXPERIENCE_VIDEOS_PT = ` ${V1} , ${V2} `;

    expect(getExperienceVideos('pt')).toEqual([V1, V2]);
  });

  it('uses the Spanish list when set, otherwise falls back to the Portuguese one', () => {
    process.env.EXPERIENCE_VIDEOS_PT = V1;
    expect(getExperienceVideos('es')).toEqual([V1]);

    process.env.EXPERIENCE_VIDEOS_ES = V2;
    expect(getExperienceVideos('es')).toEqual([V2]);
    expect(getExperienceVideos('pt')).toEqual([V1]);
  });

  it('only ever returns https Bunny player links', () => {
    process.env.EXPERIENCE_VIDEOS_PT = [
      V1,
      'http://player.mediadelivery.net/embed/1/insecure',
      'https://evil.example.com/embed/1/x',
      'https://player.mediadelivery.net.evil.example/embed/1/x',
      'javascript:alert(1)',
      'not a url',
    ].join(',');

    expect(getExperienceVideos('pt')).toEqual([V1]);
  });

  it('returns an empty list when nothing is configured', () => {
    expect(getExperienceVideos('pt')).toEqual([]);
  });
});
