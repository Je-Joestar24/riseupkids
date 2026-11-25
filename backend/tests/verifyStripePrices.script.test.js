/**
 * scripts/verifyStripePrices.js against a fake Stripe that can ONLY read prices (so a write would crash the test).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { problemsWithPrice, verifyStripePrices } = require('../scripts/verifyStripePrices');
const pricing = require('../services/familyPlanPricing.service');

const LIVE_KEY = 'sk_live_SECRETSECRET';
const TEST_KEY = 'sk_test_SECRETSECRET';

const idFor = (cell) => `price_${cell.region}_${cell.kids}_${cell.interval}`;
const stripePrice = (cell, extra = {}) => ({
  id: idFor(cell),
  active: true,
  livemode: false,
  product: 'prod_1',
  currency: cell.currency.toLowerCase(),
  unit_amount: cell.cents,
  metadata: { region: cell.region, kids: String(cell.kids), interval: cell.interval },
  recurring: cell.interval === 'monthly' ? { interval: 'month', interval_count: 1 } : null,
  ...extra,
});

/** Read-only Stripe: only `prices.retrieve`. Anything else is not a function and would throw. */
const readOnlyStripe = (byId) => ({
  prices: {
    retrieve: async (id) => {
      if (!byId[id]) throw new Error(`No such price: '${id}'`);
      return byId[id];
    },
  },
});

let dir;
let lines;
const log = (line) => lines.push(line);
const text = () => lines.join('\n');

function setup({ mode = 'test', includeMonthly = false, mutate = (prices) => prices } = {}) {
  const cells = pricing.listPriceCells({ includeMonthly });
  const prices = {};
  cells.forEach((cell) => { prices[idFor(cell)] = stripePrice(cell, { livemode: mode === 'live' }); });
  const file = { productId: 'prod_1', prices: { br: {}, us: {}, eu: {} } };
  const monthly = { br: {}, us: {}, eu: {} };
  cells.forEach((cell) => { (cell.interval === 'annual' ? file.prices : monthly)[cell.region][cell.kids] = idFor(cell); });
  if (includeMonthly) file.monthlyPrices = monthly;
  fs.writeFileSync(path.join(dir, `stripeFamilyPlanPrices.${mode}.json`), JSON.stringify(file));
  return { prices: mutate(prices), file };
}

const verify = (prices, key = TEST_KEY, extra = {}) =>
  verifyStripePrices({ stripe: readOnlyStripe(prices), secretKey: key, configDir: dir, log, ...extra });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-prices-'));
  lines = [];
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('everything is right', () => {
  it('passes with 12 OK lines and exit 0, using only reads', async () => {
    const { prices } = setup();
    const result = await verify(prices);
    expect(result).toMatchObject({ exitCode: 0, ok: 12, problems: 0 });
    expect(lines.filter((l) => l.startsWith('OK'))).toHaveLength(12);
    expect(text()).toMatch(/12 fine, 0 need attention/);
  });

  it('works for a live key and the live file', async () => {
    const { prices } = setup({ mode: 'live' });
    expect((await verify(prices, LIVE_KEY)).exitCode).toBe(0);
  });

  it('also checks monthly when the file has monthly ids', async () => {
    const { prices } = setup({ includeMonthly: true });
    const result = await verify(prices);
    expect(result.ok).toBe(24);
  });

  it('never prints the key', async () => {
    const { prices } = setup();
    await verify(prices);
    expect(text()).not.toMatch(/SECRETSECRET/);
  });
});

describe('each way a price can be wrong', () => {
  const brOne = pricing.listPriceCells()[0];
  const wrong = async (extra, expected) => {
    const { prices } = setup({ mutate: (p) => ({ ...p, [idFor(brOne)]: stripePrice(brOne, extra) }) });
    const result = await verify(prices);
    expect(result.exitCode).toBe(1);
    expect(result.problems).toBe(1);
    expect(text()).toMatch(expected);
  };

  it('the OLD amount (R$799 instead of R$699)', () => wrong({ unit_amount: 79900 }, /amount is 79900, the price list says 69900/));
  it('the wrong currency', () => wrong({ currency: 'usd' }, /currency is usd, expected brl/));
  it('archived', () => wrong({ active: false }, /archived/));
  it('a recurring price where annual is paid once', () => wrong({ recurring: { interval: 'month' } }, /recurring price, but annual is paid once/));
  it('another product', () => wrong({ product: 'prod_other' }, /belongs to product prod_other/));
  it('a product object instead of an id is read too', () => wrong({ product: { id: 'prod_other' } }, /belongs to product prod_other/));
  it('a wrong region tag', () => wrong({ metadata: { region: 'us', kids: '1' } }, /region tag is us, expected br/));
  it('a wrong children tag', () => wrong({ metadata: { region: 'br', kids: '3' } }, /children tag is 3, expected 1/));
  it('a TEST price on a live key', async () => {
    const { prices } = setup({ mode: 'live', mutate: (p) => ({ ...p, [idFor(brOne)]: stripePrice(brOne, { livemode: false }) }) });
    const result = await verify(prices, LIVE_KEY);
    expect(result.exitCode).toBe(1);
    expect(text()).toMatch(/TEST price but the key is LIVE/);
  });
  it('a LIVE price on a test key', async () => {
    const { prices } = setup({ mutate: (p) => ({ ...p, [idFor(brOne)]: stripePrice(brOne, { livemode: true }) }) });
    expect((await verify(prices)).exitCode).toBe(1);
    expect(text()).toMatch(/LIVE price but the key is TEST/);
  });
  it('several problems on one price are all listed', () => wrong({ unit_amount: 1, currency: 'usd', active: false }, /archived \(inactive\); amount is 1,.*; currency is usd/));
});

describe('missing prices', () => {
  it('a price id that Stripe does not know ("No such price") is a problem with Stripe\'s own words', async () => {
    const { prices } = setup({ mutate: (p) => { const copy = { ...p }; delete copy.price_us_2_annual; return copy; } });
    const result = await verify(prices);
    expect(result.exitCode).toBe(1);
    expect(text()).toMatch(/PROBLEM\s+us 2 children annual.*No such price: 'price_us_2_annual'/);
  });

  it('a cell of the plan with no id in the file is a problem', async () => {
    const { prices, file } = setup();
    delete file.prices.eu[4];
    fs.writeFileSync(path.join(dir, 'stripeFamilyPlanPrices.test.json'), JSON.stringify(file));
    const result = await verify(prices);
    expect(result.exitCode).toBe(1);
    expect(text()).toMatch(/eu 4 children annual\s+no price id in the file \(expected 310\.00 EUR\)/);
  });

  it('every id unknown (the live site\'s case) reports every cell and exits 1', async () => {
    setup();
    const result = await verify({});
    expect(result).toMatchObject({ exitCode: 1, ok: 0, problems: 12 });
    expect(text()).toMatch(/Fix: with the right key set/);
  });
});

describe('no usable price file', () => {
  it('a live key with only a test file: stops with what to run, and never checks test ids against live', async () => {
    setup({ mode: 'test' });
    const retrieve = jest.fn();
    const result = await verifyStripePrices({ stripe: { prices: { retrieve } }, secretKey: LIVE_KEY, configDir: dir, log });
    expect(result).toMatchObject({ exitCode: 1, problems: 1 });
    expect(text()).toMatch(/createStripePrices\.js --dry-run/);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('a broken file is reported, not a crash', async () => {
    fs.writeFileSync(path.join(dir, 'stripeFamilyPlanPrices.test.json'), '{ nope');
    const result = await verify({});
    expect(result.exitCode).toBe(1);
    expect(text()).toMatch(/Could not read stripeFamilyPlanPrices\.test\.json/);
  });

  it('nothing at all with a test key says to run the create script', async () => {
    const result = await verify({});
    expect(result.exitCode).toBe(1);
    expect(text()).toMatch(/No price file found/);
  });

  it('the old shared file still works for a test key, and says it is the old one', async () => {
    const { prices } = setup();
    fs.renameSync(path.join(dir, 'stripeFamilyPlanPrices.test.json'), path.join(dir, 'stripeFamilyPlanPrices.json'));
    const result = await verify(prices);
    expect(result.exitCode).toBe(0);
    expect(text()).toMatch(/OLD shared file/);
  });
});

describe('notes that do not fail the check', () => {
  it('ids for 5 to 10 children are a note, not a problem', async () => {
    const { prices, file } = setup();
    file.prices.br[5] = 'price_old_5';
    file.prices.us[10] = 'price_old_10';
    fs.writeFileSync(path.join(dir, 'stripeFamilyPlanPrices.test.json'), JSON.stringify(file));
    const result = await verify(prices);
    expect(result).toMatchObject({ exitCode: 0, notes: 2 });
    expect(text()).toMatch(/NOTE\s+br 5 children annual: id in the file but not part of the plan/);
  });

  it('a missing legacy STRIPE_PRICE_ID_YEARLY is a note, not a problem', async () => {
    const { prices } = setup();
    const result = await verify(prices, TEST_KEY, { legacyYearlyPriceId: 'price_yearly_gone' });
    expect(result).toMatchObject({ exitCode: 0, notes: 1 });
    expect(text()).toMatch(/older single-price subscription flow/);
  });

  it('a legacy yearly price that exists adds no note', async () => {
    const { prices } = setup();
    prices.price_yearly_ok = { id: 'price_yearly_ok' };
    expect((await verify(prices, TEST_KEY, { legacyYearlyPriceId: 'price_yearly_ok' })).notes).toBe(0);
  });
});

describe('problemsWithPrice', () => {
  const cell = pricing.listPriceCells({ includeMonthly: true }).find((c) => c.region === 'us' && c.kids === 2 && c.interval === 'monthly');

  it('accepts a right monthly price', () => {
    expect(problemsWithPrice({ cell, price: stripePrice(cell), mode: 'test', productId: 'prod_1' })).toEqual([]);
  });

  it.each([
    [{ recurring: null }, /every month/],
    [{ recurring: { interval: 'year' } }, /every month/],
    [{ recurring: { interval: 'month', interval_count: 3 } }, /every month/],
  ])('refuses a monthly price that is %p', (extra, expected) => {
    expect(problemsWithPrice({ cell, price: stripePrice(cell, extra), mode: 'test', productId: 'prod_1' }).join(' ')).toMatch(expected);
  });
});
