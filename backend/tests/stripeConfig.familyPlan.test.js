/**
 * config/stripe.js hands the REAL key to the price-file loader, so a live key never reads test price ids.
 * (The loader itself is tested in stripeFamilyPlanFile.test.js; this proves config/stripe.js uses it correctly.)
 */
describe('config/stripe: Family Plan price ids come from the file for this kind of key', () => {
  let origEnv;
  let warnSpy;
  let loader;

  const load = (secretKey, loaded) => {
    jest.resetModules();
    if (secretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = secretKey;
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    loader = jest.fn(() => loaded);
    jest.doMock('../config/stripeFamilyPlanFile', () => ({
      ...jest.requireActual('../config/stripeFamilyPlanFile'),
      loadFamilyPlanConfig: loader,
    }));
    return require('../config/stripe');
  };

  const good = { productId: 'prod_family', prices: { br: { 1: 'price_1' }, us: {}, eu: {} }, monthlyPrices: {}, error: null };

  beforeEach(() => {
    origEnv = { ...process.env };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = origEnv;
    warnSpy.mockRestore();
    jest.dontMock('../config/stripeFamilyPlanFile');
    jest.resetModules();
  });

  it('asks the loader with the real secret key (so a live key gets the live file)', () => {
    load('sk_live_REAL', good);
    expect(loader).toHaveBeenCalledWith({ secretKey: 'sk_live_REAL' });
  });

  it('asks the loader with a test key too', () => {
    load('sk_test_REAL', good);
    expect(loader).toHaveBeenCalledWith({ secretKey: 'sk_test_REAL' });
  });

  it('asks with no key when Stripe is not configured', () => {
    load(undefined, { ...good, productId: '', prices: { br: {}, us: {}, eu: {} } });
    expect(loader).toHaveBeenCalledWith({ secretKey: undefined });
  });

  it('exports what the loader returned: product id and prices', () => {
    const config = load('sk_test_x', good);
    expect(config.STRIPE_FAMILY_PLAN_PRODUCT_ID).toBe('prod_family');
    expect(config.STRIPE_FAMILY_PLAN_PRICES).toEqual({ br: { 1: 'price_1' }, us: {}, eu: {} });
  });

  it('exports the kind of key (live, test or unknown) without exposing the key', () => {
    expect(load('sk_live_x', good).STRIPE_KEY_MODE).toBe('live');
    expect(load('sk_test_x', good).STRIPE_KEY_MODE).toBe('test');
    expect(load(undefined, good).STRIPE_KEY_MODE).toBe('unknown');
    expect(JSON.stringify(Object.keys(load('sk_live_secretvalue', good)))).not.toMatch(/secretvalue/);
  });

  it('a live key with no live file: the price ids are empty and the server says what to run (it does not fall back)', () => {
    const config = load('sk_live_x', {
      ...good, productId: '', prices: { br: {}, us: {}, eu: {} },
      error: 'No stripeFamilyPlanPrices.live.json found. Run createStripePrices.js',
    });

    expect(config.STRIPE_FAMILY_PLAN_PRODUCT_ID).toBe('');
    expect(config.STRIPE_FAMILY_PLAN_PRICES.br).toEqual({});
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No stripeFamilyPlanPrices.live.json found'));
  });

  it('does not warn about prices when Stripe is not configured at all (optional provider)', () => {
    load(undefined, { ...good, error: 'something' });
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('something'));
  });

  it('does not warn when the file is fine', () => {
    load('sk_test_x', good);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringMatching(/prices|price file|Family Plan/i));
  });
});
