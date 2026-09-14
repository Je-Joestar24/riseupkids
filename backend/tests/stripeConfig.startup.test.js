/**
 * Chunk 8 — Stripe webhook secret startup assertion.
 *
 * Stripe stays optional (PayPal/PagBank cover the same feature, so a deployment that doesn't use
 * Stripe must still boot), but if STRIPE_SECRET_KEY is configured, a missing
 * STRIPE_WEBHOOK_SECRET is a real misconfiguration that should be visible at boot rather than
 * discovered the first time a real webhook hits the API and gets a 500.
 */

describe('config/stripe — STRIPE_WEBHOOK_SECRET startup assertion', () => {
  let origEnv;
  let warnSpy;

  beforeEach(() => {
    origEnv = { ...process.env };
    jest.resetModules();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = origEnv;
    warnSpy.mockRestore();
  });

  it('warns at require-time when Stripe is configured but the webhook secret is missing', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    delete process.env.STRIPE_WEBHOOK_SECRET;

    require('../config/stripe');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('STRIPE_WEBHOOK_SECRET is missing'));
  });

  it('does not warn when both are configured', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';

    require('../config/stripe');

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('STRIPE_WEBHOOK_SECRET is missing'));
  });

  it('does not warn when Stripe is not configured at all (optional provider)', () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    require('../config/stripe');

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('STRIPE_WEBHOOK_SECRET is missing'));
  });
});
