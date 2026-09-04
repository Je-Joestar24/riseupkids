/**
 * RUK-SEC-025 — CORS policy: explicit allow-list, fail-closed, no wildcard dev fallback.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-025
 */
const { isOriginAllowed, assertCorsConfig } = require('../config/cors');

const PROD_LIST = 'https://riseup.kids,https://app.riseup.kids';

describe('isOriginAllowed — CORS_ORIGIN set', () => {
  const env = { CORS_ORIGIN: PROD_LIST, NODE_ENV: 'production' };

  it('allows a listed origin', () => {
    expect(isOriginAllowed('https://app.riseup.kids', env)).toBe(true);
    expect(isOriginAllowed('https://riseup.kids', env)).toBe(true);
  });

  it('allows requests with no Origin / Origin: null (native app builds)', () => {
    expect(isOriginAllowed(undefined, env)).toBe(true);
    expect(isOriginAllowed('null', env)).toBe(true);
    expect(isOriginAllowed('', env)).toBe(true);
  });

  it('blocks an unlisted origin', () => {
    expect(isOriginAllowed('https://evil.com', env)).toBe(false);
    expect(isOriginAllowed('https://app.riseup.kids.evil.com', env)).toBe(false);
    expect(isOriginAllowed('http://app.riseup.kids', env)).toBe(false); // scheme must match exactly
  });

  it('blocks the old expo wildcard even though the fallback is gone', () => {
    expect(isOriginAllowed('https://anything.expo.dev', env)).toBe(false);
    expect(isOriginAllowed('https://x.expo.run', env)).toBe(false);
  });
});

describe('isOriginAllowed — CORS_ORIGIN unset (development fallback)', () => {
  const env = { NODE_ENV: 'development' };

  it('allows localhost / 127.0.0.1 on any port', () => {
    expect(isOriginAllowed('http://localhost:3000', env)).toBe(true);
    expect(isOriginAllowed('https://127.0.0.1:8081', env)).toBe(true);
    expect(isOriginAllowed(undefined, env)).toBe(true);
  });

  it('allows NOTHING else — no expo wildcard, no arbitrary origin', () => {
    expect(isOriginAllowed('https://foo.expo.dev', env)).toBe(false);
    expect(isOriginAllowed('https://evil.com', env)).toBe(false);
    expect(isOriginAllowed('http://localhost.evil.com', env)).toBe(false);
  });
});

describe('assertCorsConfig', () => {
  it('throws when CORS_ORIGIN is missing in production', () => {
    expect(() => assertCorsConfig({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN must be set/);
  });
  it('throws when CORS_ORIGIN is missing in staging', () => {
    expect(() => assertCorsConfig({ NODE_ENV: 'staging' })).toThrow(/CORS_ORIGIN must be set/);
  });
  it('does not throw in development without CORS_ORIGIN', () => {
    expect(() => assertCorsConfig({ NODE_ENV: 'development' })).not.toThrow();
  });
  it('does not throw in production when CORS_ORIGIN is set', () => {
    expect(() => assertCorsConfig({ NODE_ENV: 'production', CORS_ORIGIN: PROD_LIST })).not.toThrow();
  });
});
