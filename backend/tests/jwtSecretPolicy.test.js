/**
 * RUK-SEC-003 — JWT secret strength policy.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-003
 */
const { assertStrongJwtSecret, KNOWN_WEAK_SECRETS } = require('../config/jwtSecret');

const SHORT_SECRET = 'x'.repeat(20); // < 32 chars, not a known-weak value
const STRONG_SECRET = 'x'.repeat(64); // >= 32 chars

describe('config/jwtSecret assertStrongJwtSecret', () => {
  it('throws when JWT_SECRET is missing', () => {
    expect(() => assertStrongJwtSecret({ NODE_ENV: 'production' })).toThrow(/not set/i);
  });

  it('throws when JWT_SECRET is empty/whitespace', () => {
    expect(() => assertStrongJwtSecret({ JWT_SECRET: '   ', NODE_ENV: 'production' })).toThrow(
      /not set/i
    );
  });

  it('throws for the exact .env.example default value, in every environment', () => {
    for (const nodeEnv of ['development', 'production', 'staging', undefined]) {
      expect(() =>
        assertStrongJwtSecret({
          JWT_SECRET: 'your_super_secret_jwt_key_change_this_in_production',
          NODE_ENV: nodeEnv,
        })
      ).toThrow(/known example\/default/i);
    }
  });

  it('throws for other known-weak values case-insensitively', () => {
    expect(() =>
      assertStrongJwtSecret({ JWT_SECRET: 'SECRET', NODE_ENV: 'production' })
    ).toThrow(/known example\/default/i);
    expect(() =>
      assertStrongJwtSecret({ JWT_SECRET: 'ChangeMe', NODE_ENV: 'development' })
    ).toThrow(/known example\/default/i);
  });

  it('throws in production when the secret is shorter than 32 characters', () => {
    expect(() =>
      assertStrongJwtSecret({ JWT_SECRET: SHORT_SECRET, NODE_ENV: 'production' })
    ).toThrow(/at least 32 characters/i);
  });

  it('throws in staging when the secret is shorter than 32 characters', () => {
    expect(() =>
      assertStrongJwtSecret({ JWT_SECRET: SHORT_SECRET, NODE_ENV: 'staging' })
    ).toThrow(/at least 32 characters/i);
  });

  it('does NOT throw in development for a short (but not known-weak) secret — warns instead', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      assertStrongJwtSecret({ JWT_SECRET: SHORT_SECRET, NODE_ENV: 'development' })
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/shorter than 32 characters/i));
    warnSpy.mockRestore();
  });

  it('passes silently for a strong secret in production', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      assertStrongJwtSecret({ JWT_SECRET: STRONG_SECRET, NODE_ENV: 'production' })
    ).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('passes for a strong secret in development', () => {
    expect(() =>
      assertStrongJwtSecret({ JWT_SECRET: STRONG_SECRET, NODE_ENV: 'development' })
    ).not.toThrow();
  });

  it('KNOWN_WEAK_SECRETS includes the shipped .env.example placeholder', () => {
    expect(KNOWN_WEAK_SECRETS.has('your_super_secret_jwt_key_change_this_in_production')).toBe(true);
  });
});
