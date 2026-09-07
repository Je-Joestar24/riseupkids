/**
 * RUK-SEC-034 / Chunk 4 — required-environment-variable check.
 * @see backend/scripts/check-env.js
 */
const { checkEnv, isProdLike } = require('../scripts/check-env');

const BASE = {
  JWT_SECRET: 'x'.repeat(40),
  MONGODB_URI: 'mongodb://localhost:27017/riseupkids',
  CORS_ORIGIN: 'https://riseup.kids',
  NODE_ENV: 'production',
};

describe('isProdLike', () => {
  it('true for production and staging only', () => {
    expect(isProdLike({ NODE_ENV: 'production' })).toBe(true);
    expect(isProdLike({ NODE_ENV: 'staging' })).toBe(true);
    expect(isProdLike({ NODE_ENV: 'development' })).toBe(false);
    expect(isProdLike({})).toBe(false);
  });
});

describe('checkEnv — hard requirements', () => {
  it('passes when every required var is present', () => {
    const r = checkEnv(BASE);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('flags a missing JWT_SECRET in any environment', () => {
    const r = checkEnv({ ...BASE, NODE_ENV: 'development', JWT_SECRET: '' });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('JWT_SECRET');
  });

  it('flags a missing MONGODB_URI', () => {
    const { MONGODB_URI, ...rest } = BASE;
    const r = checkEnv(rest);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('MONGODB_URI');
  });

  it('treats a whitespace-only value as missing', () => {
    const r = checkEnv({ ...BASE, JWT_SECRET: '   ' });
    expect(r.missing).toContain('JWT_SECRET');
  });
});

describe('checkEnv — production-only requirements', () => {
  it('requires CORS_ORIGIN in production', () => {
    const { CORS_ORIGIN, ...rest } = BASE;
    expect(checkEnv(rest).missing).toContain('CORS_ORIGIN');
  });

  it('does not require CORS_ORIGIN in development', () => {
    const { CORS_ORIGIN, ...rest } = BASE;
    const r = checkEnv({ ...rest, NODE_ENV: 'development' });
    expect(r.ok).toBe(true);
  });
});

describe('checkEnv — conditional (feature-gated) requirements', () => {
  it('requires SMTP_* only when MAIL_DRIVER=smtp', () => {
    const r = checkEnv({ ...BASE, MAIL_DRIVER: 'smtp' });
    expect(r.ok).toBe(false);
    expect(r.missing.join(' ')).toMatch(/SMTP_HOST/);
    expect(r.missing.join(' ')).toMatch(/SMTP_PASSWORD/);
  });

  it('is satisfied when MAIL_DRIVER=smtp and all SMTP vars are set', () => {
    const r = checkEnv({
      ...BASE,
      MAIL_DRIVER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'u@example.com',
      SMTP_PASSWORD: 'app-password',
    });
    expect(r.ok).toBe(true);
  });

  it('requires the Vision key fields only when GOOGLE_VISION_ENABLED=true', () => {
    expect(checkEnv({ ...BASE, GOOGLE_VISION_ENABLED: 'false' }).ok).toBe(true);
    const r = checkEnv({ ...BASE, GOOGLE_VISION_ENABLED: 'true' });
    expect(r.missing.join(' ')).toMatch(/GOOGLE_VISION_PRIVATE_KEY/);
  });

  it('requires the PagBank core vars once any PagBank var is set', () => {
    const r = checkEnv({ ...BASE, PAGSEGURO_ENV: 'sandbox' });
    expect(r.missing.join(' ')).toMatch(/PAGSEGURO_ACCESS_TOKEN/);
    expect(r.missing.join(' ')).toMatch(/PAGSEGURO_API_BASE/);
  });
});

describe('checkEnv — non-fatal warnings', () => {
  it('warns (not fails) when AWS S3 is not configured in production', () => {
    const r = checkEnv(BASE);
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/AWS S3 is not fully configured/);
  });

  it('does not warn about AWS in development', () => {
    const r = checkEnv({ ...BASE, NODE_ENV: 'development' });
    expect(r.warnings).toEqual([]);
  });
});
