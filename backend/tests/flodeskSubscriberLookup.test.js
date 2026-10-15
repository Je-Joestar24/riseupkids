/**
 * Flodesk subscriber lookup used by the free Smoothie Experience page. Mocked axios — never a
 * real network call.
 */
jest.mock('axios');
const axios = require('axios');
const logger = require('../config/logger');
const { getSubscriberByEmail, getFreebieSegmentId } = require('../services/flodeskService');

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, FLODESK_API_KEY: 'test-api-key' };
  delete process.env.FLODESK_BASE_URL;
  jest.spyOn(logger, 'error').mockImplementation(() => {});
});

afterAll(() => {
  process.env = originalEnv;
});

describe('getSubscriberByEmail', () => {
  it('GETs the subscriber by email (with a literal @, which Flodesk requires) with Basic auth and returns it', async () => {
    const subscriber = { id: 'sub1', status: 'active', segments: [{ id: 'seg1' }] };
    axios.get.mockResolvedValue({ data: subscriber });

    const result = await getSubscriberByEmail('  Parent+Test@Example.com ');

    expect(result).toEqual(subscriber);
    const [url, config] = axios.get.mock.calls[0];
    expect(url).toBe('https://api.flodesk.com/v1/subscribers/Parent+Test@Example.com');
    expect(config.headers.Authorization).toBe(
      `Basic ${Buffer.from('test-api-key:').toString('base64')}`
    );
    expect(config.timeout).toBeGreaterThan(0);
  });

  it('keeps the @ literal — Flodesk returns 404 for "%40", which wrongly turned real subscribers into "not found"', async () => {
    axios.get.mockResolvedValue({ data: { id: 's', status: 'active' } });

    await getSubscriberByEmail('jejomar@gmail.com');

    const [url] = axios.get.mock.calls[0];
    expect(url).toBe('https://api.flodesk.com/v1/subscribers/jejomar@gmail.com');
    expect(url).not.toContain('%40');
  });

  it('still encodes anything that could change the request path', async () => {
    axios.get.mockResolvedValue({ data: {} });

    await getSubscriberByEmail('a/../b?x=1#y@example.com');

    const [url] = axios.get.mock.calls[0];
    const segment = url.slice('https://api.flodesk.com/v1/subscribers/'.length);
    expect(segment).not.toMatch(/[/?#]/);
    expect(segment).toContain('%2F');
    expect(segment).toContain('%3F');
    expect(segment).toContain('%23');
  });

  it('returns null (not an error) when Flodesk has no such subscriber (404)', async () => {
    axios.get.mockRejectedValue({ message: 'Request failed', response: { status: 404 } });

    await expect(getSubscriberByEmail('nobody@example.com')).resolves.toBeNull();
  });

  it('throws for any other failure, so "could not check" is never mistaken for "not subscribed"', async () => {
    axios.get.mockRejectedValue({ message: 'Request failed', response: { status: 500 } });
    await expect(getSubscriberByEmail('a@example.com')).rejects.toThrow(/lookup failed/i);

    axios.get.mockRejectedValue(new Error('timeout of 8000ms exceeded'));
    await expect(getSubscriberByEmail('a@example.com')).rejects.toThrow(/lookup failed/i);
  });

  it('never writes the email address to the logs', async () => {
    axios.get.mockRejectedValue({ message: 'boom', response: { status: 500 } });

    await expect(getSubscriberByEmail('secret.person@example.com')).rejects.toThrow();

    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret.person');
  });

  it('throws without calling Flodesk when the API key or email is missing', async () => {
    await expect(getSubscriberByEmail('')).rejects.toThrow(/email is required/i);
    await expect(getSubscriberByEmail(undefined)).rejects.toThrow(/email is required/i);

    delete process.env.FLODESK_API_KEY;
    await expect(getSubscriberByEmail('a@example.com')).rejects.toThrow(/FLODESK_API_KEY/);

    expect(axios.get).not.toHaveBeenCalled();
  });
});

describe('getFreebieSegmentId', () => {
  it('reads the segment for each page language from its own setting', () => {
    process.env.FLODESK_FREEBIE_SEGMENT_PT = ' pt-segment ';
    process.env.FLODESK_FREEBIE_SEGMENT_ES = 'es-segment';

    expect(getFreebieSegmentId('pt')).toBe('pt-segment');
    expect(getFreebieSegmentId('es')).toBe('es-segment');
  });

  it('throws when the language has no segment configured', () => {
    delete process.env.FLODESK_FREEBIE_SEGMENT_ES;

    expect(() => getFreebieSegmentId('es')).toThrow(/FLODESK_FREEBIE_SEGMENT_ES/);
  });

  it('rejects a language that has no freebie page', () => {
    expect(() => getFreebieSegmentId('en')).toThrow();
  });
});
