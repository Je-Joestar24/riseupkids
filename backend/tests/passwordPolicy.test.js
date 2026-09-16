/**
 * Chunk 10 — password policy: minimum length + breached-password check (HIBP k-anonymity API,
 * mocked here — never a real network call in tests).
 */
jest.mock('axios');
const axios = require('axios');
const { assertPasswordPolicy, validatePasswordLength, MIN_LENGTH } = require('../services/passwordPolicy.service');
const { isPasswordBreached } = require('../services/hibp.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('validatePasswordLength', () => {
  it(`rejects passwords shorter than ${MIN_LENGTH} characters`, () => {
    expect(() => validatePasswordLength('short1234')).toThrow(/at least 12/i);
  });

  it('accepts a password of exactly the minimum length', () => {
    expect(() => validatePasswordLength('a'.repeat(MIN_LENGTH))).not.toThrow();
  });

  it('rejects empty/missing passwords', () => {
    expect(() => validatePasswordLength('')).toThrow();
    expect(() => validatePasswordLength(undefined)).toThrow();
  });
});

describe('hibp.service.isPasswordBreached', () => {
  it('sends only the SHA-1 prefix, never the password itself', async () => {
    axios.get.mockResolvedValue({ data: '' });
    await isPasswordBreached('CorrectHorseBattery99');

    expect(axios.get).toHaveBeenCalledTimes(1);
    const [url] = axios.get.mock.calls[0];
    expect(url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);
    expect(url).not.toContain('CorrectHorseBattery99');
  });

  it('returns true when the suffix is present in the range response', async () => {
    const crypto = require('crypto');
    const sha1 = crypto.createHash('sha1').update('password123456', 'utf8').digest('hex').toUpperCase();
    axios.get.mockResolvedValue({
      data: `${sha1.slice(5)}:5\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1`,
    });
    const result = await isPasswordBreached('password123456');
    expect(result).toBe(true);
  });

  it('returns false when the suffix is absent', async () => {
    axios.get.mockResolvedValue({ data: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1' });
    expect(await isPasswordBreached('SomeVeryUniquePassword123!')).toBe(false);
  });

  it('fails OPEN (returns false, does not throw) when the HIBP API is unreachable', async () => {
    axios.get.mockRejectedValue(new Error('network error'));
    await expect(isPasswordBreached('anything')).resolves.toBe(false);
  });
});

describe('assertPasswordPolicy', () => {
  it('throws for a too-short password without calling HIBP', async () => {
    await expect(assertPasswordPolicy('short')).rejects.toThrow(/at least 12/i);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('throws for a breached password that otherwise meets the length requirement', async () => {
    // force a match by mocking the exact suffix computed for this password
    const crypto = require('crypto');
    const sha1 = crypto.createHash('sha1').update('LongEnoughPassword1', 'utf8').digest('hex').toUpperCase();
    axios.get.mockResolvedValue({ data: `${sha1.slice(5)}:99` });

    await expect(assertPasswordPolicy('LongEnoughPassword1')).rejects.toThrow(/known data breach/i);
  });

  it('passes for a long, non-breached password', async () => {
    axios.get.mockResolvedValue({ data: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1' });
    await expect(assertPasswordPolicy('SomeVeryUniquePassword123!')).resolves.toBeUndefined();
  });
});
