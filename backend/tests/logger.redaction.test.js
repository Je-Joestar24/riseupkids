/**
 * RUK-SEC-010 / Chunk 6 — the logger's central redaction.
 * @see backend/config/logger.js
 */
const logger = require('../config/logger');
const { scrub, scrubString, isSensitiveKey } = logger;

describe('isSensitiveKey', () => {
  it('flags secret-ish and PII keys, case-insensitively', () => {
    for (const k of [
      'password', 'PASSWORD', 'passwd', 'refreshToken', 'access_token', 'authorization',
      'client_secret', 'apiKey', 'JWT_SECRET', 'otp', 'resetCode', 'cvv', 'cardNumber',
      'MONGODB_URI', 'taxId', 'cpf', 'displayName', 'dob', 'phoneNumber', 'photoUrl',
    ]) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });
  it('leaves ordinary keys alone', () => {
    for (const k of ['userId', 'plan', 'amountCents', 'status', 'count', 'createdAt', 'title']) {
      expect(isSensitiveKey(k)).toBe(false);
    }
  });
});

describe('scrub — structured objects', () => {
  it('masks sensitive values at any depth, keeps the rest', () => {
    const out = scrub({
      userId: 'u1',
      password: 'hunter2',
      nested: { refreshToken: 'abc', plan: 'yearly', deep: { cvv: '123', ok: 1 } },
    });
    expect(out).toEqual({
      userId: 'u1',
      password: '[Redacted]',
      nested: { refreshToken: '[Redacted]', plan: 'yearly', deep: { cvv: '[Redacted]', ok: 1 } },
    });
  });

  it('masks child PII', () => {
    const out = scrub({ child: { displayName: 'Timmy', dob: '2016-05-01', stars: 12 } });
    expect(out.child.displayName).toBe('[Redacted]');
    expect(out.child.dob).toBe('[Redacted]');
    expect(out.child.stars).toBe(12);
  });

  it('is cycle- and depth-safe', () => {
    const a = { name: 'a' };
    a.self = a;
    expect(() => scrub(a)).not.toThrow();
    expect(scrub(a).self).toBe('[Circular]');
  });

  it('converts Errors to a plain object with no stack in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const freshScrub = require('../config/logger').scrub;
    const out = freshScrub({ err: new Error('boom at /srv/app/x.js') });
    expect(out.err.type).toBe('Error');
    expect(out.err.stack).toBeUndefined();
    process.env.NODE_ENV = prev;
    jest.resetModules();
  });
});

describe('scrubString — free-text secrets', () => {
  const JWT =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('redacts a JWT embedded in a message', () => {
    expect(scrubString(`token is ${JWT} end`)).toBe('token is [Redacted] end');
  });
  it('redacts a bearer token', () => {
    expect(scrubString('Authorization: Bearer abcdef123456ghijkl')).toContain('Bearer [Redacted]');
  });
  it('partially masks an email', () => {
    expect(scrubString('sent to jane.doe@example.com now')).toBe('sent to j***@example.com now');
  });
  it('leaves short / clean strings untouched', () => {
    expect(scrubString('ok')).toBe('ok');
    expect(scrubString('subscription activated for plan yearly')).toBe(
      'subscription activated for plan yearly'
    );
  });
});

describe('scrub — arrays and dates', () => {
  it('walks arrays and caps very long ones', () => {
    const out = scrub({ users: [{ password: 'a' }, { name: 'ok', token: 'b' }] });
    expect(out.users[0].password).toBe('[Redacted]');
    expect(out.users[1].token).toBe('[Redacted]');
    expect(scrub({ list: Array(200).fill({ ok: 1 }) }).list).toHaveLength(50);
  });
  it('passes Date values through', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(scrub({ createdAt: d }).createdAt).toBe(d);
  });
});
