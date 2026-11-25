/**
 * scripts/createStripePrices.js, run against a FAKE Stripe account in memory (no network, no real key).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  parseArgs,
  tagsOf,
  problemsWith,
  planPriceActions,
  runCreatePrices,
} = require('../scripts/createStripePrices');
const pricing = require('../services/familyPlanPricing.service');

const LIVE_KEY = 'sk_live_SECRETSECRET';
const TEST_KEY = 'sk_test_SECRETSECRET';

/** A tiny Stripe: products and prices in memory, with the same paging and errors that matter. */
function fakeStripe({ products = [{ id: 'prod_1', name: 'RiseUpKids', active: true }], prices = [], failCurrencies = [], failArchive = [] } = {}) {
  const state = { products, prices: [...prices], calls: { create: [], update: [] }, next: 1 };
  const page = (list, params) => {
    const start = params.starting_after ? list.findIndex((item) => item.id === params.starting_after) + 1 : 0;
    const data = list.slice(start, start + (params.limit || 10));
    return Promise.resolve({ data, has_more: start + data.length < list.length });
  };
  return {
    state,
    products: { list: (params) => page(state.products.filter((p) => p.active), params) },
    prices: {
      list: (params) => page(state.prices.filter((p) => p.active && p.product === params.product), params),
      create: async (params) => {
        state.calls.create.push(params);
        if (failCurrencies.includes(params.currency)) throw new Error(`Currency ${params.currency} is not supported`);
        const price = {
          id: `price_new_${state.next++}`,
          active: true,
          product: params.product,
          currency: params.currency,
          unit_amount: params.unit_amount,
          nickname: params.nickname,
          metadata: params.metadata,
          recurring: params.recurring || null,
        };
        state.prices.push(price);
        return price;
      },
      update: async (id, params) => {
        state.calls.update.push({ id, ...params });
        if (failArchive.includes(id)) throw new Error('You cannot archive the default price of a product');
        Object.assign(state.prices.find((p) => p.id === id), params);
        return state.prices.find((p) => p.id === id);
      },
    },
  };
}

/** The right Stripe price for a cell, as the script would have made it. */
const rightPrice = (cell, id = `price_ok_${cell.region}_${cell.kids}_${cell.interval}`) => ({
  id,
  active: true,
  product: 'prod_1',
  currency: cell.currency.toLowerCase(),
  unit_amount: cell.cents,
  metadata: { kids: String(cell.kids), region: cell.region, interval: cell.interval },
  recurring: cell.interval === 'monthly' ? { interval: 'month', interval_count: 1 } : null,
});
const allRight = (includeMonthly = false) => pricing.listPriceCells({ includeMonthly }).map((cell) => rightPrice(cell));

let dir;
let lines;
const log = (line) => lines.push(line);
const run = (stripe, flags = [], key = TEST_KEY, extra = {}) =>
  runCreatePrices({ stripe, secretKey: key, options: parseArgs(flags), configDir: dir, log, ...extra });
const files = () => fs.readdirSync(dir).sort();
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-prices-'));
  lines = [];
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('options', () => {
  it('reads the flags', () => {
    expect(parseArgs(['--dry-run', '--confirm', '--include-monthly', '--archive-mismatched', '--archive-unused'])).toEqual({
      dryRun: true, confirm: true, includeMonthly: true, archiveMismatched: true, archiveUnused: true, help: false,
    });
    expect(parseArgs([])).toMatchObject({ dryRun: false, confirm: false, includeMonthly: false });
  });

  it('refuses a flag it does not know, so a typo never runs with defaults', () => {
    expect(() => parseArgs(['--confirmm'])).toThrow(/Unknown option: --confirmm/);
    expect(() => parseArgs(['--dry-run=false'])).toThrow(/Unknown option/);
  });
});

describe('reading a Stripe price', () => {
  it('reads our tags', () => {
    expect(tagsOf({ metadata: { region: 'br', kids: '2', interval: 'annual' } })).toEqual({ region: 'br', kids: 2, interval: 'annual' });
  });

  it('a price from the older script (no interval tag) is annual when one-time, monthly when recurring', () => {
    expect(tagsOf({ metadata: { region: 'us', kids: '1' }, recurring: null }).interval).toBe('annual');
    expect(tagsOf({ metadata: { region: 'us', kids: '1' }, recurring: { interval: 'month' } }).interval).toBe('monthly');
  });

  it.each([[{}], [{ metadata: {} }], [{ metadata: { region: 'br' } }], [{ metadata: { kids: '2' } }], [{ metadata: { region: 'br', kids: 'two' } }], [null]])(
    'a price without both tags is not ours: %p',
    (price) => {
      expect(tagsOf(price)).toBeNull();
    }
  );

  it('finds what is wrong with a price', () => {
    const cell = { region: 'br', currency: 'BRL', kids: 1, interval: 'annual', cents: 69900 };
    expect(problemsWith(rightPrice(cell), cell)).toEqual([]);
    expect(problemsWith({ ...rightPrice(cell), unit_amount: 79900 }, cell)[0]).toMatch(/amount is 79900, expected 69900/);
    expect(problemsWith({ ...rightPrice(cell), currency: 'usd' }, cell)[0]).toMatch(/currency is usd/);
    expect(problemsWith({ ...rightPrice(cell), recurring: { interval: 'month' } }, cell)[0]).toMatch(/recurring/);
    const monthly = { ...cell, interval: 'monthly', cents: 7000 };
    expect(problemsWith({ ...rightPrice(monthly), recurring: { interval: 'year' } }, monthly)[0]).toMatch(/every month/);
    expect(problemsWith({ ...rightPrice(monthly), recurring: null }, monthly)[0]).toMatch(/every month/);
  });
});

describe('planning', () => {
  it('an empty account needs all 12 annual prices (3 regions x 1-4 children)', () => {
    const plan = planPriceActions([]);
    expect(plan.actions).toHaveLength(12);
    expect(plan.actions.every((a) => a.type === 'create')).toBe(true);
  });

  it('with monthly it needs 24', () => {
    expect(planPriceActions([], { includeMonthly: true }).actions).toHaveLength(24);
  });

  it('reuses every right price', () => {
    const plan = planPriceActions(allRight());
    expect(plan.actions.every((a) => a.type === 'reuse')).toBe(true);
  });

  it('a wrong amount blocks that cell', () => {
    const prices = allRight();
    prices[0] = { ...prices[0], unit_amount: 1 };
    const plan = planPriceActions(prices);
    expect(plan.blocked).toHaveLength(1);
    expect(plan.blocked[0].replaces[0].problems[0]).toMatch(/amount is 1/);
  });

  it('a right price next to a wrong one is reused, the wrong one is listed as stale', () => {
    const prices = [...allRight(), { ...allRight()[0], id: 'price_old', unit_amount: 5 }];
    const plan = planPriceActions(prices);
    expect(plan.blocked).toHaveLength(0);
    expect(plan.actions[0]).toMatchObject({ type: 'reuse', stale: [{ id: 'price_old' }] });
  });

  it('children outside the plan (5 to 10) are "unused"', () => {
    const old = { id: 'price_5', metadata: { region: 'br', kids: '5' }, unit_amount: 1, currency: 'brl', recurring: null };
    expect(planPriceActions([old]).unused.map((p) => p.id)).toEqual(['price_5']);
  });

  it('a price with no tags (a hand-made placeholder) is neither used nor unused: left alone', () => {
    const placeholder = { id: 'price_placeholder', metadata: {}, unit_amount: 79900, currency: 'brl', recurring: null };
    const plan = planPriceActions([placeholder]);
    expect(plan.untagged.map((p) => p.id)).toEqual(['price_placeholder']);
    expect(plan.unused).toEqual([]);
    expect(plan.actions.every((a) => a.type === 'create')).toBe(true);
  });

  it('an existing monthly price is ignored when monthly was not asked for', () => {
    const monthly = pricing.listPriceCells({ includeMonthly: true }).filter((c) => c.interval === 'monthly').map((c) => rightPrice(c));
    const plan = planPriceActions(monthly);
    expect(plan.unused).toEqual([]);
    expect(plan.blocked).toEqual([]);
  });
});

describe('a fresh run with a test key', () => {
  it('creates exactly 12 annual prices with the right amount, currency, tags and no recurrence', async () => {
    const stripe = fakeStripe();
    const result = await run(stripe);

    expect(result).toMatchObject({ exitCode: 0, created: 12, reused: 0, wrote: true });
    expect(stripe.state.calls.create).toHaveLength(12);
    for (const params of stripe.state.calls.create) {
      expect(params.recurring).toBeUndefined();
      expect(params.metadata.interval).toBe('annual');
      expect(params.product).toBe('prod_1');
    }
    const brOne = stripe.state.calls.create.find((p) => p.metadata.region === 'br' && p.metadata.kids === '1');
    expect(brOne).toMatchObject({ currency: 'brl', unit_amount: 69900, nickname: '1_children_BRL' });
    const usFour = stripe.state.calls.create.find((p) => p.metadata.region === 'us' && p.metadata.kids === '4');
    expect(usFour).toMatchObject({ currency: 'usd', unit_amount: 31000 });
    const euTwo = stripe.state.calls.create.find((p) => p.metadata.region === 'eu' && p.metadata.kids === '2');
    expect(euTwo).toMatchObject({ currency: 'eur', unit_amount: 19000 });
  });

  it('creates no price for 5 or more children, and no box', async () => {
    const stripe = fakeStripe();
    await run(stripe);
    expect(stripe.state.calls.create.every((p) => Number(p.metadata.kids) <= 4)).toBe(true);
    expect(JSON.stringify(stripe.state.calls.create)).not.toMatch(/box/i);
  });

  it('writes the TEST file with 4 ids per region, and nothing else', async () => {
    const stripe = fakeStripe();
    await run(stripe);

    expect(files()).toEqual(['stripeFamilyPlanPrices.test.json']);
    const written = readJson('stripeFamilyPlanPrices.test.json');
    expect(written.productId).toBe('prod_1');
    expect(written.mode).toBe('test');
    for (const region of ['br', 'us', 'eu']) expect(Object.keys(written.prices[region])).toEqual(['1', '2', '3', '4']);
    expect(written.monthlyPrices).toBeUndefined();
  });

  it('the written ids are the ids Stripe really gave back', async () => {
    const stripe = fakeStripe();
    await run(stripe);
    const written = readJson('stripeFamilyPlanPrices.test.json');
    const stored = stripe.state.prices.find((p) => p.id === written.prices.br[3]);
    expect(stored).toMatchObject({ unit_amount: 179900, currency: 'brl', metadata: { region: 'br', kids: '3' } });
  });

  it('never prints the secret key', async () => {
    await run(fakeStripe());
    expect(lines.join('\n')).not.toMatch(/SECRETSECRET/);
  });
});

describe('running it again', () => {
  it('creates nothing the second time and reuses all 12', async () => {
    const stripe = fakeStripe();
    await run(stripe);
    const firstFile = fs.readFileSync(path.join(dir, 'stripeFamilyPlanPrices.test.json'), 'utf8');
    stripe.state.calls.create.length = 0;

    const second = await run(stripe);

    expect(second).toMatchObject({ exitCode: 0, created: 0, reused: 12 });
    expect(stripe.state.calls.create).toHaveLength(0);
    expect(fs.readFileSync(path.join(dir, 'stripeFamilyPlanPrices.test.json'), 'utf8')).toBe(firstFile);
  });

  it('only creates what is missing', async () => {
    const prices = allRight().filter((p) => !(p.metadata.region === 'eu' && p.metadata.kids === '4'));
    const stripe = fakeStripe({ prices });
    const result = await run(stripe);
    expect(result).toMatchObject({ created: 1, reused: 11 });
    expect(stripe.state.calls.create[0]).toMatchObject({ currency: 'eur', unit_amount: 31000 });
  });
});

describe('dry run', () => {
  it('changes nothing in Stripe and writes no file, and says so', async () => {
    const stripe = fakeStripe();
    const result = await run(stripe, ['--dry-run']);

    expect(result).toMatchObject({ exitCode: 0, created: 0, wrote: false });
    expect(stripe.state.calls.create).toHaveLength(0);
    expect(stripe.state.calls.update).toHaveLength(0);
    expect(files()).toEqual([]);
    expect(lines.join('\n')).toMatch(/Dry run finished/);
    expect(lines.filter((l) => /CREATE /.test(l))).toHaveLength(12);
  });

  it('with a live key and no --confirm still just reports (that is what a dry run is for)', async () => {
    const result = await run(fakeStripe(), ['--dry-run'], LIVE_KEY);
    expect(result.exitCode).toBe(0);
  });

  it('exits 1 when it finds a wrong price, so it is noticed', async () => {
    const prices = allRight();
    prices[3] = { ...prices[3], unit_amount: 999 };
    const result = await run(fakeStripe({ prices }), ['--dry-run']);
    expect(result.exitCode).toBe(1);
  });
});

describe('a live key', () => {
  it('refuses to create anything without --confirm, and writes no file', async () => {
    const stripe = fakeStripe();
    const result = await run(stripe, [], LIVE_KEY);

    expect(result.exitCode).toBe(1);
    expect(stripe.state.calls.create).toHaveLength(0);
    expect(files()).toEqual([]);
    expect(lines.join('\n')).toMatch(/LIVE key/);
    expect(lines.join('\n')).toMatch(/--confirm/);
  });

  it('with --confirm creates the prices and writes the LIVE file, not the test file', async () => {
    const stripe = fakeStripe();
    const result = await run(stripe, ['--confirm'], LIVE_KEY);

    expect(result).toMatchObject({ exitCode: 0, created: 12 });
    expect(files()).toEqual(['stripeFamilyPlanPrices.live.json']);
    expect(readJson('stripeFamilyPlanPrices.live.json').mode).toBe('live');
  });

  it('does not touch the old shared file', async () => {
    fs.writeFileSync(path.join(dir, 'stripeFamilyPlanPrices.json'), '{"productId":"prod_old","prices":{}}');
    await run(fakeStripe(), ['--confirm'], LIVE_KEY);
    expect(fs.readFileSync(path.join(dir, 'stripeFamilyPlanPrices.json'), 'utf8')).toBe('{"productId":"prod_old","prices":{}}');
  });

  it('a key that is neither live nor test is refused', async () => {
    const stripe = fakeStripe();
    const result = await run(stripe, ['--confirm'], 'whatever');
    expect(result.exitCode).toBe(1);
    expect(stripe.state.calls.create).toHaveLength(0);
  });
});

describe('a price with the wrong amount', () => {
  const withWrong = () => {
    const prices = allRight();
    prices[0] = { ...prices[0], id: 'price_wrong', unit_amount: 79900 }; // br 1 child at the OLD R$799
    return prices;
  };

  it('stops before changing anything, lists it, and writes no file', async () => {
    const stripe = fakeStripe({ prices: withWrong() });
    const result = await run(stripe);

    expect(result.exitCode).toBe(1);
    expect(stripe.state.calls.create).toHaveLength(0);
    expect(stripe.state.calls.update).toHaveLength(0);
    expect(files()).toEqual([]);
    expect(lines.join('\n')).toMatch(/price_wrong: amount is 79900, expected 69900/);
    expect(lines.join('\n')).toMatch(/--archive-mismatched/);
  });

  it('with --archive-mismatched archives it and creates the right one', async () => {
    const stripe = fakeStripe({ prices: withWrong() });
    const result = await run(stripe, ['--archive-mismatched']);

    expect(result).toMatchObject({ exitCode: 0, archived: 1, created: 1, reused: 11 });
    expect(stripe.state.calls.update).toEqual([{ id: 'price_wrong', active: false }]);
    expect(stripe.state.calls.create).toHaveLength(1);
    expect(stripe.state.calls.create[0]).toMatchObject({ unit_amount: 69900, currency: 'brl' });
    const written = readJson('stripeFamilyPlanPrices.test.json');
    expect(written.prices.br[1]).not.toBe('price_wrong');
  });

  it('a wrong currency counts too', async () => {
    const prices = allRight();
    prices[1] = { ...prices[1], currency: 'usd' };
    expect((await run(fakeStripe({ prices }))).exitCode).toBe(1);
  });

  it('an older wrong duplicate beside a right price is only archived on request', async () => {
    const prices = [...allRight(), { ...allRight()[0], id: 'price_dupe', unit_amount: 1 }];
    const stripe = fakeStripe({ prices });
    await run(stripe);
    expect(stripe.state.calls.update).toHaveLength(0);
    await run(stripe, ['--archive-mismatched']);
    expect(stripe.state.calls.update).toEqual([{ id: 'price_dupe', active: false }]);
  });
});

describe('prices that are not ours', () => {
  const placeholder = { id: 'price_placeholder', active: true, product: 'prod_1', currency: 'brl', unit_amount: 79900, metadata: {}, recurring: null };

  it('the hand-made placeholder price is never archived, even with every archive flag', async () => {
    const stripe = fakeStripe({ prices: [placeholder] });
    await run(stripe, ['--archive-mismatched', '--archive-unused']);
    expect(stripe.state.calls.update.map((u) => u.id)).not.toContain('price_placeholder');
    expect(stripe.state.prices.find((p) => p.id === 'price_placeholder').active).toBe(true);
    expect(lines.join('\n')).toMatch(/Left alone[^\n]*price_placeholder/);
  });

  it('old 5-10 children prices are only archived with --archive-unused', async () => {
    const old = { id: 'price_5kids', active: true, product: 'prod_1', currency: 'brl', unit_amount: 263900, metadata: { region: 'br', kids: '5' }, recurring: null };
    const stripe = fakeStripe({ prices: [old] });
    await run(stripe);
    expect(stripe.state.calls.update).toHaveLength(0);
    expect(lines.join('\n')).toMatch(/--archive-unused/);

    await run(stripe, ['--archive-unused']);
    expect(stripe.state.calls.update).toEqual([{ id: 'price_5kids', active: false }]);
    expect(readJson('stripeFamilyPlanPrices.test.json').prices.br[5]).toBeUndefined();
  });
});

describe('monthly', () => {
  it('is not created unless asked for', async () => {
    const stripe = fakeStripe();
    await run(stripe);
    expect(stripe.state.calls.create.filter((p) => p.recurring)).toHaveLength(0);
  });

  it('--include-monthly creates 12 recurring-every-month prices as well, and saves them separately', async () => {
    const stripe = fakeStripe();
    const result = await run(stripe, ['--include-monthly']);

    expect(result.created).toBe(24);
    const monthly = stripe.state.calls.create.filter((p) => p.recurring);
    expect(monthly).toHaveLength(12);
    expect(monthly.every((p) => p.recurring.interval === 'month' && p.metadata.interval === 'monthly')).toBe(true);
    expect(monthly.find((p) => p.metadata.region === 'br' && p.metadata.kids === '1')).toMatchObject({ unit_amount: 7000, currency: 'brl', nickname: '1_children_BRL_monthly' });
    const written = readJson('stripeFamilyPlanPrices.test.json');
    expect(Object.keys(written.monthlyPrices.us)).toEqual(['1', '2', '3', '4']);
    expect(written.prices.us[1]).not.toBe(written.monthlyPrices.us[1]);
  });

  it('a later run without the flag keeps the monthly ids already in the file', async () => {
    const stripe = fakeStripe();
    await run(stripe, ['--include-monthly']);
    const before = readJson('stripeFamilyPlanPrices.test.json').monthlyPrices;
    await run(stripe);
    expect(readJson('stripeFamilyPlanPrices.test.json').monthlyPrices).toEqual(before);
  });
});

describe('when Stripe cannot do something', () => {
  it('no product: says exactly what to create, changes nothing', async () => {
    const stripe = fakeStripe({ products: [] });
    await expect(run(stripe)).rejects.toThrow(/Product "RiseUpKids" not found.*Product catalog/s);
    expect(stripe.state.calls.create).toHaveLength(0);
    expect(files()).toEqual([]);
  });

  it('uses another product name when told to', async () => {
    const stripe = fakeStripe({ products: [{ id: 'prod_x', name: 'My Plan', active: true }] });
    stripe.state.prices = [];
    const result = await run(stripe, [], TEST_KEY, { productName: 'My Plan' });
    expect(result.exitCode).toBe(0);
    expect(stripe.state.calls.create.every((p) => p.product === 'prod_x')).toBe(true);
  });

  it('two products with the same name: refuses to guess', async () => {
    const stripe = fakeStripe({ products: [{ id: 'a', name: 'RiseUpKids', active: true }, { id: 'b', name: 'RiseUpKids', active: true }] });
    await expect(run(stripe)).rejects.toThrow(/More than one active product/);
  });

  it('a product with a similar name is not picked', async () => {
    const stripe = fakeStripe({ products: [{ id: 'a', name: 'RiseUpKids Beta', active: true }] });
    await expect(run(stripe)).rejects.toThrow(/not found/);
  });

  it('a currency the account does not accept: reports it, finishes the rest, writes no file, and a rerun reuses what worked', async () => {
    const stripe = fakeStripe({ failCurrencies: ['eur'] });
    const first = await run(stripe);

    expect(first.exitCode).toBe(1);
    expect(first.created).toBe(8);
    expect(lines.filter((l) => /^\s+FAILED/.test(l))).toHaveLength(4);
    expect(lines.join('\n')).toMatch(/does not accept one of the currencies/);
    expect(files()).toEqual([]);

    const fixed = fakeStripe({ prices: stripe.state.prices });
    const second = await run(fixed);
    expect(second).toMatchObject({ exitCode: 0, created: 4, reused: 8, wrote: true });
  });

  it('a failed archive stops the file from being written', async () => {
    const prices = allRight();
    prices[0] = { ...prices[0], id: 'price_wrong', unit_amount: 1 };
    const stripe = fakeStripe({ prices, failArchive: ['price_wrong'] });
    const result = await run(stripe, ['--archive-mismatched']);
    expect(result.exitCode).toBe(1);
    expect(files()).toEqual([]);
  });
});

describe('large accounts', () => {
  it('reads every page of prices, not just the first', async () => {
    const noise = Array.from({ length: 230 }, (_, i) => ({ id: `price_noise_${i}`, active: true, product: 'prod_1', currency: 'usd', unit_amount: 1, metadata: {}, recurring: null }));
    const stripe = fakeStripe({ prices: [...noise, ...allRight()] });
    const result = await run(stripe);
    expect(result).toMatchObject({ exitCode: 0, created: 0, reused: 12 });
  });
});
