/**
 * The offline price checks (scripts/lib/familyPlanPriceChecks.js) and the three commands built on them:
 *   npm run pricing:check, npm run paypal:verify-prices, npm run pagbank:verify-prices
 * Each check is proven twice: a GOOD input passes, and every kind of bad input is caught.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const checks = require('../scripts/lib/familyPlanPriceChecks');
const { runPricingCheck } = require('../scripts/checkFamilyPlanPricing');
const { verifyPayPalPrices } = require('../scripts/verifyPayPalPrices');
const { verifyPagbankPrices } = require('../scripts/verifyPagbankPrices');
const pricing = require('../services/familyPlanPricing.service');

// ---- good inputs, built from the price list
const kidsKey = (n) => (n === 1 ? '1_child' : `${n}_children`);
const goodPayPal = () => {
  const out = {};
  for (const currency of ['USD', 'BRL', 'EUR']) {
    out[currency] = {};
    for (const kids of [1, 2, 3, 4]) {
      const amount = pricing.getAnnualCents(currency, kids) / 100;
      out[currency][kidsKey(kids)] = amount;
      out[currency][`${kidsKey(kids)}_yearly`] = amount;
    }
  }
  return out;
};
/** A PagBank line-item builder that behaves like the real one: one line, the BRL annual price, 1 to 4 children only. */
const goodBuilder = (kids) => {
  const count = pricing.normalizeChildCount(kids);
  const cents = pricing.getAnnualCents('BRL', count);
  return { items: [{ reference_id: `family-plan-${count}`, unit_amount: cents, quantity: 1 }], totalCents: cents };
};
const tableSource = (name, region, edit = (t) => t) => {
  const rows = edit(Object.fromEntries([1, 2, 3, 4].map((k) => [k, pricing.getAnnualCents(region, k) / 100])));
  const lines = Object.entries(rows).map(([k, v]) => `  ${k}: { display: 'x', amount: ${v} },`);
  return `const ${name} = {\n${lines.join('\n')}\n}\n`;
};
const goodSite = (limit = '') => ['br', 'us', 'eu'].map((r, i) => tableSource(['PLAN_PRICES_BR', 'PLAN_PRICES_USD', 'PLAN_PRICES_EUR'][i], r)).join('\n') + limit;

const levels = (findings, level) => findings.filter((f) => f.level === level);
const texts = (findings) => findings.map((f) => f.text).join('\n');

describe('PayPal config', () => {
  it('passes when it holds the annual price for every tier and its yearly twin', () => {
    expect(checks.checkPayPalConfig(goodPayPal())).toEqual([]);
  });

  it('accepts 120.0 and 120 as the same price', () => {
    const config = goodPayPal();
    config.USD['1_child'] = 120.0;
    expect(checks.checkPayPalConfig(config)).toEqual([]);
  });

  it('catches the old leftover prices (USD 151, EUR 130, BRL 799)', () => {
    const config = goodPayPal();
    config.USD['1_child'] = 151;
    config.EUR['1_child_yearly'] = 130;
    config.BRL['1_child'] = 799;
    const found = texts(checks.checkPayPalConfig(config));
    expect(found).toMatch(/USD 1_child: is 151, the price list says 120/);
    expect(found).toMatch(/EUR 1_child_yearly: is 130, the price list says 120/);
    expect(found).toMatch(/BRL 1_child: is 799, the price list says 699/);
  });

  it('catches a price that is off by one cent', () => {
    const config = goodPayPal();
    config.USD['2_children'] = 190.01;
    expect(checks.checkPayPalConfig(config)).toHaveLength(1);
  });

  it('catches a missing 4-children tier, and a missing yearly twin', () => {
    const config = goodPayPal();
    delete config.USD['4_children'];
    delete config.BRL['2_children_yearly'];
    const found = texts(checks.checkPayPalConfig(config));
    expect(found).toMatch(/USD 4_children: missing \(expected 310\)/);
    expect(found).toMatch(/BRL 2_children_yearly: missing/);
  });

  it('catches a tier beyond the plan that a customer could buy (5 children)', () => {
    const config = goodPayPal();
    config.USD['5_children'] = 275;
    config.EUR['10_children_yearly'] = 500;
    const found = checks.checkPayPalConfig(config);
    expect(levels(found, 'problem')).toHaveLength(2);
    expect(texts(found)).toMatch(/5_children: not part of the plan/);
  });

  it('catches a currency we do not sell in, and a missing currency', () => {
    const config = goodPayPal();
    config.GBP = { '1_child': 100 };
    delete config.EUR;
    const found = texts(checks.checkPayPalConfig(config));
    expect(found).toMatch(/GBP is not one we sell in/);
    expect(found).toMatch(/EUR: no prices at all/);
  });

  it.each([[null], [undefined], ['text'], [5]])('a missing or wrong file (%p) is a problem, not a crash', (value) => {
    expect(levels(checks.checkPayPalConfig(value), 'problem')).toHaveLength(1);
  });

  it('a price stored as text is not accepted', () => {
    const config = goodPayPal();
    config.USD['1_child'] = '120';
    expect(texts(checks.checkPayPalConfig(config))).toMatch(/USD 1_child: missing/);
  });
});

describe('PagBank prices (checked through the code that builds the checkout)', () => {
  it('passes for a builder that gives one line equal to the BRL annual price, 1 to 4 children, and refuses 0 and 5', () => {
    expect(checks.checkPagbankPricing({ buildCheckoutLineItems: goodBuilder })).toEqual([]);
  });

  it('catches the old R$799 for one child', () => {
    const builder = (kids, box) => (kids === 1 ? { items: [{ unit_amount: 79900 }], totalCents: 79900 } : goodBuilder(kids, box));
    const found = texts(checks.checkPagbankPricing({ buildCheckoutLineItems: builder }));
    expect(found).toMatch(/1 children: total is 79900 centavos, the price list says 69900/);
    expect(found).toMatch(/1 children: the line is 79900 centavos/);
  });

  it('catches the activity box still being added (it is asked for with the old second argument)', () => {
    const builder = (kids, box) => {
      const built = goodBuilder(kids);
      if (box) built.items.push({ reference_id: 'activity-box', unit_amount: 29700, quantity: 1 });
      return built;
    };
    const found = texts(checks.checkPagbankPricing({ buildCheckoutLineItems: builder }));
    expect(found).toMatch(/2 line items, expected exactly one \(no box\)/);
  });

  it('catches a total that differs from the line', () => {
    const builder = (kids) => ({ items: [{ unit_amount: pricing.getAnnualCents('BRL', kids) }], totalCents: 1 });
    expect(texts(checks.checkPagbankPricing({ buildCheckoutLineItems: builder }))).toMatch(/total is 1 centavos/);
  });

  it('catches a size that is not sold being accepted (5 children, or 0)', () => {
    // a builder that never refuses: 0 and 5 children are "built" too
    const loose = (kids, box) => (kids >= 1 && kids <= 4 ? goodBuilder(kids, box) : { items: [{ unit_amount: 1 }], totalCents: 1 });
    const found = texts(checks.checkPagbankPricing({ buildCheckoutLineItems: loose }));
    expect(found).toMatch(/0 children is accepted/);
    expect(found).toMatch(/5 children is accepted/);
  });

  it('catches a size inside the plan that cannot be built', () => {
    const builder = (kids) => {
      if (kids === 3) throw new Error('no price');
      return goodBuilder(kids);
    };
    expect(texts(checks.checkPagbankPricing({ buildCheckoutLineItems: builder }))).toMatch(/3 children: cannot be built \(no price\)/);
  });

  it.each([[undefined], [null], ['x']])('a missing builder (%p) is a problem, not a crash', (value) => {
    expect(levels(checks.checkPagbankPricing({ buildCheckoutLineItems: value }), 'problem')).toHaveLength(1);
  });
});

describe('the old per-provider price files', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checks-old-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('passes when neither exists', () => {
    expect(checks.checkOldPriceFilesGone({ dir })).toEqual([]);
  });

  it('flags each one that is still there', () => {
    fs.writeFileSync(path.join(dir, 'paypalFamilyPlanPrices.json'), '{}');
    fs.writeFileSync(path.join(dir, 'pagseguroFamilyPlanPrices.json'), '{}');
    const found = checks.checkOldPriceFilesGone({ dir });
    expect(found).toHaveLength(2);
    expect(texts(found)).toMatch(/Nothing reads it any more/);
  });

  it('does not touch the Stripe price-id files (they are still needed)', () => {
    fs.writeFileSync(path.join(dir, 'stripeFamilyPlanPrices.live.json'), '{}');
    expect(checks.checkOldPriceFilesGone({ dir })).toEqual([]);
  });
});

describe('a screen\'s own price tables', () => {
  it('passes when each table equals the price list', () => {
    expect(levels(checks.checkSiteTables(goodSite(), 'Site'), 'problem')).toEqual([]);
  });

  it('reads a table the way the real files are written', () => {
    const source = "const PLAN_PRICES_BR = {\n  1: { installment: '12x R$74,90', cash: 799, amount: 799, discountPercent: null },\n  2: { installment: 'x', cash: 1299, amount: 1299 },\n}\n";
    expect(checks.readSiteTable(source, 'PLAN_PRICES_BR')).toEqual({ 1: 799, 2: 1299 });
    expect(checks.readSiteTable(source, 'PLAN_PRICES_USD')).toBeNull();
  });

  it('catches the old prices on a screen', () => {
    const source = tableSource('PLAN_PRICES_USD', 'us', (t) => ({ ...t, 1: 799 }));
    expect(texts(checks.checkSiteTables(source, 'Site'))).toMatch(/PLAN_PRICES_USD 1 children: shows 799, the price list says 120/);
  });

  it('catches sizes the screen offers beyond 4, grouped', () => {
    const source = tableSource('PLAN_PRICES_BR', 'br', (t) => ({ ...t, 5: 2639, 6: 3079 }));
    const found = levels(checks.checkSiteTables(source, 'Site'), 'problem');
    expect(found).toHaveLength(1);
    expect(found[0].text).toMatch(/PLAN_PRICES_BR 5, 6 children: not part of the plan/);
  });

  it('catches a missing size', () => {
    const source = tableSource('PLAN_PRICES_EUR', 'eu', (t) => { const copy = { ...t }; delete copy[4]; return copy; });
    expect(texts(checks.checkSiteTables(source, 'Site'))).toMatch(/PLAN_PRICES_EUR 4 children: missing/);
  });

  it('no table at all is the goal: only a note', () => {
    const found = checks.checkSiteTables('export const nothing = 1', 'Site');
    expect(levels(found, 'problem')).toEqual([]);
    expect(levels(found, 'note')).toHaveLength(1);
  });
});

describe('child limit in source', () => {
  it('passes at 4', () => {
    expect(checks.checkChildLimitInSource('const MAX_CHILDREN = 4;', 'f', ['MAX_CHILDREN'])).toEqual([]);
    expect(checks.checkChildLimitInSource('export const MAX_CHILDREN = 4', 'f', ['MAX_CHILDREN'])).toEqual([]);
  });

  it.each([['const MAX_CHILDREN = 10;'], ['const MAX_CHILDREN = 3;'], ['const MAX_CHILDREN_UI = 3'], ['const MAX_CHILDREN=5']])('catches %p', (source) => {
    expect(levels(checks.checkChildLimitInSource(source, 'f', ['MAX_CHILDREN_UI', 'MAX_CHILDREN']), 'problem')).toHaveLength(1);
  });

  it('checks every name it finds', () => {
    const found = checks.checkChildLimitInSource('const MAX_CHILDREN_UI = 3\nconst MAX_CHILDREN = 10', 'f', ['MAX_CHILDREN_UI', 'MAX_CHILDREN']);
    expect(levels(found, 'problem')).toHaveLength(2);
  });

  it('a limit read from the price list (MAX_CHILDREN = pricing.MAX_CHILDREN) is right, and says nothing', () => {
    expect(checks.checkChildLimitInSource('const MAX_CHILDREN = pricing.MAX_CHILDREN;', 'f', ['MAX_CHILDREN'])).toEqual([]);
  });

  it('a limit read from some other place is not accepted as "derived"', () => {
    expect(levels(checks.checkChildLimitInSource('const MAX_CHILDREN = config.MAX_CHILDREN;', 'f', ['MAX_CHILDREN']), 'note')).toHaveLength(1);
  });

  it('says so when there is nothing to check', () => {
    expect(levels(checks.checkChildLimitInSource('nothing', 'f', ['MAX_CHILDREN']), 'note')).toHaveLength(1);
  });
});

describe('box markers in source', () => {
  it('passes when the box is gone', () => {
    expect(checks.checkNoBoxInSource('const plan = 1;', 'f', ['addBox', 'Activity Box'])).toEqual([]);
  });

  it('catches each leftover', () => {
    const found = checks.checkNoBoxInSource('function x(addBox) { name: "Family Plan – Activity Box" }', 'f', ['addBox', 'Activity Box', 'BOX_PRICE_PER_CHILD']);
    expect(found).toHaveLength(2);
  });
});

describe('Stripe price-id files', () => {
  let dir;
  const write = (name, data) => fs.writeFileSync(path.join(dir, name), typeof data === 'string' ? data : JSON.stringify(data));
  const goodFile = () => ({ productId: 'prod_1', prices: Object.fromEntries(['br', 'us', 'eu'].map((r) => [r, { 1: 'a', 2: 'b', 3: 'c', 4: 'd' }])) });

  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checks-stripe-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('passes with a complete live and test file', () => {
    write('stripeFamilyPlanPrices.live.json', goodFile());
    write('stripeFamilyPlanPrices.test.json', goodFile());
    expect(levels(checks.checkStripeFiles({ dir }), 'problem')).toEqual([]);
  });

  it('a missing live file is a note telling what happens on live, not a failure of this check', () => {
    const found = checks.checkStripeFiles({ dir });
    expect(levels(found, 'problem')).toEqual([]);
    expect(texts(found)).toMatch(/live checkout has no prices until createStripePrices\.js is run/);
  });

  it('catches a cell with no id', () => {
    const file = goodFile();
    delete file.prices.eu[3];
    write('stripeFamilyPlanPrices.live.json', file);
    expect(texts(checks.checkStripeFiles({ dir }))).toMatch(/eu 3 children: no price id/);
  });

  it('an id for a size that is not sold is a note', () => {
    const file = goodFile();
    file.prices.br[7] = 'x';
    write('stripeFamilyPlanPrices.test.json', file);
    const found = checks.checkStripeFiles({ dir });
    expect(levels(found, 'problem')).toEqual([]);
    expect(texts(found)).toMatch(/br 7 children: id for a size that is not sold/);
  });

  it('the old shared file is only a note', () => {
    write('stripeFamilyPlanPrices.json', goodFile());
    const found = checks.checkStripeFiles({ dir });
    expect(texts(found)).toMatch(/OLD shared file/);
    expect(levels(found, 'problem')).toEqual([]);
  });

  it('a broken file is a problem', () => {
    write('stripeFamilyPlanPrices.live.json', '{ nope');
    expect(levels(checks.checkStripeFiles({ dir }), 'problem')).toHaveLength(1);
  });
});

describe('a screen must not keep its own price table', () => {
  it('passes for a screen without one', () => {
    expect(checks.checkNoPriceTablesInSource('export const MIN_CHILDREN = 1', 'Site', ['PLAN_PRICES_', 'BOX_PRICE_PER_CHILD'])).toEqual([]);
  });

  it('flags a table or the box price coming back', () => {
    const found = checks.checkNoPriceTablesInSource('const PLAN_PRICES_BR = {}\nconst BOX_PRICE_PER_CHILD = {}', 'Site', ['PLAN_PRICES_', 'BOX_PRICE_PER_CHILD']);
    expect(found).toHaveLength(2);
    expect(texts(found)).toMatch(/prices come from the backend/);
  });
});

describe('prices typed into the checkout translations', () => {
  const lang = (checkout) => ({ checkout });

  it('passes for texts without a price', () => {
    expect(checks.checkNoPricesInTranslations({ pt: lang({ a: 'ou opções flexíveis' }), en: lang({ a: 'x' }), es: lang({ a: 'y' }) })).toEqual([]);
  });

  it.each([['ou R$799 à vista'], ['$799'], ['€799'], ['Only $ 120'], ['R$ 74,90 por mês']])('flags %p', (text) => {
    const found = checks.checkNoPricesInTranslations({ pt: lang({ select: { paymentNote: text } }) });
    expect(found).toHaveLength(1);
    expect(found[0].text).toMatch(/checkout\.select\.paymentNote has a price typed in/);
    expect(found[0].where).toMatch(/\(pt\)/);
  });

  it('finds it inside a list and in every language', () => {
    const found = checks.checkNoPricesInTranslations({ pt: lang({ list: ['a', 'só R$10'] }), en: lang({ list: ['$5'] }), es: lang({}) });
    expect(found).toHaveLength(2);
    expect(texts(found)).toMatch(/checkout\.list\[1\]/);
  });

  it('only looks at the checkout texts (a price elsewhere on the site is not its business)', () => {
    expect(checks.checkNoPricesInTranslations({ pt: { home: { x: 'R$799' }, checkout: { y: 'ok' } } })).toEqual([]);
  });

  it('a symbol with no number is fine', () => {
    expect(checks.checkNoPricesInTranslations({ pt: lang({ a: 'Valores em R$ ou $ ou €' }) })).toEqual([]);
  });

  it('missing texts are not a crash', () => {
    expect(checks.checkNoPricesInTranslations(undefined)).toEqual([]);
    expect(checks.checkNoPricesInTranslations({ pt: null })).toEqual([]);
  });
});

describe('code that has been switched off by commenting it out (the box, kept for later)', () => {
  it('stripComments removes line, trailing and block comments, and leaves a URL alone', () => {
    const source = [
      'const a = 1 // note addBox',
      '// const addBox = true',
      '/* block',
      '   addBox */',
      "const url = 'https://x.y/z'  // trailing",
      'const b = 2',
    ].join('\n');
    const out = checks.stripComments(source);
    expect(out).not.toMatch(/addBox|note|trailing|block/);
    expect(out).toContain("const url = 'https://x.y/z'");
    expect(out).toContain('const a = 1');
    expect(out).toContain('const b = 2');
  });

  it('a box that is only in comments is accepted', () => {
    const source = [
      '// DISABLED: activity box',
      '// const BOX_PRICE_PER_CHILD = { br: 297 };',
      '/* if (addBox) { items.push({ reference_id: `activity-box-${count}` }); } */',
      'const plan = 1; // addBox is off',
    ].join('\n');
    expect(checks.checkNoBoxInSource(source, 'f', ['addBox', 'BOX_PRICE_PER_CHILD', 'activity-box'])).toEqual([]);
  });

  it('a box in live code is still flagged, even next to commented-out box code', () => {
    const source = '// const addBox = 1\nfunction f(addBox) { return addBox }\n';
    expect(checks.checkNoBoxInSource(source, 'f', ['addBox'])).toHaveLength(1);
  });

  it('a limit or a price table that is only in a comment is ignored, live ones are not', () => {
    expect(checks.checkChildLimitInSource('// const MAX_CHILDREN = 10;\nconst MAX_CHILDREN = pricing.MAX_CHILDREN;', 'f', ['MAX_CHILDREN'])).toEqual([]);
    expect(levels(checks.checkChildLimitInSource('/* const MAX_CHILDREN = 10; */', 'f', ['MAX_CHILDREN']), 'problem')).toEqual([]);
    expect(levels(checks.checkChildLimitInSource('// ok\nconst MAX_CHILDREN = 10;', 'f', ['MAX_CHILDREN']), 'problem')).toHaveLength(1);
    expect(checks.checkNoPriceTablesInSource('// const PLAN_PRICES_BR = {}', 'f', ['PLAN_PRICES_'])).toEqual([]);
    expect(checks.checkNoPriceTablesInSource('const PLAN_PRICES_BR = {}', 'f', ['PLAN_PRICES_'])).toHaveLength(1);
    expect(checks.readSiteTable('// const PLAN_PRICES_BR = {\n//   1: { amount: 1 },\n// }', 'PLAN_PRICES_BR')).toBeNull();
  });
});

describe('printing', () => {
  it('prints PASS with notes, FAIL with problems, and returns the problem count', () => {
    const lines = [];
    const log = (l) => lines.push(l);
    expect(checks.printFindings('A', [{ level: 'note', where: 'w', text: 't' }], log)).toBe(0);
    expect(lines[0]).toBe('PASS  A');
    const bad = checks.printFindings('B', [{ level: 'problem', where: 'w', text: 'x' }, { level: 'problem', where: 'w', text: 'y' }], log);
    expect(bad).toBe(2);
    expect(lines.find((l) => l.startsWith('FAIL'))).toMatch(/B {2}\(2 problems\)/);
  });
});

// ------------------------------------------------------------------ the commands, over a fake file tree
const cleanTexts = JSON.stringify({ checkout: { select: { paymentNote: 'or flexible payment options available at checkout' }, pricing: { loading: 'Loading prices' } } });

function fakeTree(overrides = {}) {
  const B = path.join('/repo', 'backend');
  const R = '/repo';
  const goodStripe = JSON.stringify({ productId: 'p', prices: Object.fromEntries(['br', 'us', 'eu'].map((r) => [r, { 1: 'a', 2: 'b', 3: 'c', 4: 'd' }])) });
  const files = {
    [path.join(B, 'config', 'stripeFamilyPlanPrices.live.json')]: goodStripe,
    [path.join(B, 'config', 'stripeFamilyPlanPrices.test.json')]: goodStripe,
    [path.join(B, 'services', 'checkout.services.js')]: 'const MAX_CHILDREN = pricing.MAX_CHILDREN;\n',
    [path.join(B, 'services', 'pagseguro.service.js')]: 'const MAX_CHILDREN = pricing.MAX_CHILDREN;\n',
    [path.join(R, 'frontend', 'src', 'services', 'checkoutService.js')]: 'export const MIN_CHILDREN = 1;\n',
    [path.join(R, 'riseupkids-sale', 'web', 'src', 'services', 'checkoutService.js')]: 'export const MIN_CHILDREN = 1\n',
    ...Object.fromEntries(['pt', 'en', 'es'].map((lang) => [path.join(R, 'riseupkids-sale', 'web', 'src', 'i18n', `${lang}.json`), cleanTexts])),
  };
  for (const [key, value] of Object.entries(overrides)) {
    const file = path.join(R, ...key.split('/'));
    if (value === null) delete files[file];
    else files[file] = value;
  }
  const fsFake = {
    existsSync: (f) => Object.prototype.hasOwnProperty.call(files, f),
    readFileSync: (f) => {
      if (!Object.prototype.hasOwnProperty.call(files, f)) throw new Error(`ENOENT: ${f}`);
      return files[f];
    },
  };
  return { fs: fsFake, backendDir: B, repoDir: R };
}
const runCheck = (overrides, extra = {}) => {
  const lines = [];
  const result = runPricingCheck({
    ...fakeTree(overrides),
    getPayPalTable: () => goodPayPal(),
    getBuildCheckoutLineItems: () => goodBuilder,
    log: (l) => lines.push(l),
    ...extra,
  });
  return { ...result, out: lines.join('\n') };
};

describe('npm run pricing:check', () => {
  it('passes (exit 0) when every place agrees', () => {
    const result = runCheck();
    expect(result).toMatchObject({ exitCode: 0, problems: 0 });
    expect(result.out).toMatch(/All places agree with the price list/);
  });

  it.each([
    ['a PayPal price', { getPayPalTable: () => ({ ...goodPayPal(), USD: { ...goodPayPal().USD, '1_child': 151 } }) }, /USD 1_child: is 151/],
    ['PayPal missing the 4-children tier', { getPayPalTable: () => { const t = goodPayPal(); delete t.USD['4_children']; return t; } }, /USD 4_children: missing/],
    ['a PagBank price', { getBuildCheckoutLineItems: () => (kids) => (kids === 1 ? { items: [{ unit_amount: 79900 }], totalCents: 79900 } : goodBuilder(kids)) }, /1 children: total is 79900/],
    ['the PagBank box', { getBuildCheckoutLineItems: () => (kids, box) => { const b = goodBuilder(kids); if (box) b.items.push({ unit_amount: 1 }); return b; } }, /expected exactly one \(no box\)/],
  ])('fails (exit 1) on %s', (_name, extra, expected) => {
    const result = runCheck({}, extra);
    expect(result.exitCode).toBe(1);
    expect(result.problems).toBeGreaterThan(0);
    expect(result.out).toMatch(expected);
  });

  it.each([
    ['the checkout limit', { 'backend/services/checkout.services.js': 'const MAX_CHILDREN = 10;\n' }, /checkout\.services\.js: MAX_CHILDREN is 10/],
    ['the box in Stripe checkout', { 'backend/services/checkout.services.js': 'const MAX_CHILDREN = pricing.MAX_CHILDREN;\nfunction f({ addBox }) {}\n' }, /still mentions "addBox"/],
    ['the box in PagBank code', { 'backend/services/pagseguro.service.js': 'const MAX_CHILDREN = pricing.MAX_CHILDREN;\nreference_id: `activity-box-1`\n' }, /still mentions "activity-box"/],
    ['an old PayPal price file left behind', { 'backend/config/paypalFamilyPlanPrices.json': '{}' }, /paypalFamilyPlanPrices\.json: an old price file still exists/],
    ['an old PagBank price file left behind', { 'backend/config/pagseguroFamilyPlanPrices.json': '{}' }, /pagseguroFamilyPlanPrices\.json: an old price file still exists/],
    ['the web app table', { 'frontend/src/services/checkoutService.js': goodSite('export const MAX_CHILDREN = 4;\n').replace('amount: 120', 'amount: 799') }, /Web app \(frontend\): PLAN_PRICES_USD 1 children: shows 799/],
    ['the sale site limit', { 'riseupkids-sale/web/src/services/checkoutService.js': goodSite('const MAX_CHILDREN_UI = 3\n') }, /MAX_CHILDREN_UI is 3/],
    ['a Stripe file cell', { 'backend/config/stripeFamilyPlanPrices.live.json': JSON.stringify({ productId: 'p', prices: { br: { 1: 'a' }, us: {}, eu: {} } }) }, /no price id/],
  ])('fails (exit 1) on %s', (_name, overrides, expected) => {
    const result = runCheck(overrides);
    expect(result.exitCode).toBe(1);
    expect(result.problems).toBeGreaterThan(0);
    expect(result.out).toMatch(expected);
  });

  it.each([
    ['a price table back in the web app', { 'frontend/src/services/checkoutService.js': 'const PLAN_PRICES_USD = {}\n' }, /Web app \(frontend\): still holds "PLAN_PRICES_"/],
    ['a price table back in the sale site', { 'riseupkids-sale/web/src/services/checkoutService.js': 'const PLAN_PRICES_BR = {}\n' }, /Sale site \(riseupkids-sale\): still holds "PLAN_PRICES_"/],
    ['the box price back in the sale site', { 'riseupkids-sale/web/src/services/checkoutService.js': 'const BOX_PRICE_PER_CHILD = { pt: 297 }\n' }, /still holds "BOX_PRICE_PER_CHILD"/],
    ['the box back in a screen', { 'frontend/src/services/checkoutService.js': 'function f(addBox) {}\n' }, /still mentions "addBox"/],
    ['a typed price in the Portuguese texts', { 'riseupkids-sale/web/src/i18n/pt.json': JSON.stringify({ checkout: { select: { paymentNote: 'ou R$799 à vista' } } }) }, /checkout\.select\.paymentNote has a price typed in/],
    ['a typed price in the English texts', { 'riseupkids-sale/web/src/i18n/en.json': JSON.stringify({ checkout: { summary: { installment: '$799' } } }) }, /checkout\.summary\.installment has a price typed in/],
  ])('fails (exit 1) on %s', (_name, overrides, expected) => {
    const result = runCheck(overrides);
    expect(result.exitCode).toBe(1);
    expect(result.out).toMatch(expected);
  });

  it('a translation file that is not valid JSON is a problem, not a crash', () => {
    const result = runCheck({ 'riseupkids-sale/web/src/i18n/es.json': '{ nope' });
    expect(result.exitCode).toBe(1);
    expect(result.out).toMatch(/es\.json: could not be checked/);
  });

  it('translation files that are not on this machine are skipped with a note', () => {
    const tree = fakeTree();
    const lines = [];
    const noTexts = { ...tree, fs: { ...tree.fs, readFileSync: (f) => { if (/i18n/.test(f)) throw new Error('ENOENT'); return tree.fs.readFileSync(f); } } };
    const result = runPricingCheck({ ...noTexts, getPayPalTable: () => goodPayPal(), getBuildCheckoutLineItems: () => goodBuilder, log: (l) => lines.push(l) });
    expect(result.exitCode).toBe(0);
    expect(lines.join('\n')).toMatch(/riseupkids-sale i18n files: file not found on this machine: skipped/);
  });

  it('a screen that is not on this machine is skipped with a note, not failed', () => {
    const tree = fakeTree();
    const lines = [];
    const missingScreens = {
      ...tree,
      fs: { ...tree.fs, readFileSync: (f) => { if (/checkoutService\.js$/.test(f)) throw new Error('ENOENT'); return tree.fs.readFileSync(f); } },
    };
    const result = runPricingCheck({ ...missingScreens, getPayPalTable: () => goodPayPal(), getBuildCheckoutLineItems: () => goodBuilder, log: (l) => lines.push(l) });
    expect(result.exitCode).toBe(0);
    expect(lines.join('\n')).toMatch(/file not found on this machine: skipped/);
  });

  it('includeScreens: false checks the backend only: screens with the old prices do not fail it', () => {
    const oldScreens = {
      'frontend/src/services/checkoutService.js': goodSite('export const MAX_CHILDREN = 10;\n').replace('amount: 120', 'amount: 799'),
      'riseupkids-sale/web/src/services/checkoutService.js': goodSite('const MAX_CHILDREN_UI = 3\n'),
    };
    expect(runCheck(oldScreens).exitCode).toBe(1);
    const backendOnly = runCheck(oldScreens, { includeScreens: false });
    expect(backendOnly.exitCode).toBe(0);
    expect(backendOnly.out).not.toMatch(/Web app|Sale site/);
  });

  it('includeScreens: false still catches a backend problem', () => {
    const result = runCheck({ 'backend/services/checkout.services.js': 'const MAX_CHILDREN = 10;\n' }, { includeScreens: false });
    expect(result.exitCode).toBe(1);
  });

  it('a PayPal table or PagBank builder that cannot even be loaded is a problem, not a crash', () => {
    const result = runCheck({}, {
      getPayPalTable: () => { throw new Error('boom paypal'); },
      getBuildCheckoutLineItems: () => { throw new Error('boom pagbank'); },
    });
    expect(result.exitCode).toBe(1);
    expect(result.problems).toBe(2);
    expect(result.out).toMatch(/boom paypal/);
    expect(result.out).toMatch(/boom pagbank/);
  });
});

describe('npm run paypal:verify-prices and pagbank:verify-prices', () => {
  const dirWith = (names) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-old-'));
    names.forEach((name) => fs.writeFileSync(path.join(dir, name), '{}'));
    return dir;
  };

  it('PayPal: exit 0 when the table matches and no old file is left', () => {
    const dir = dirWith([]);
    const result = verifyPayPalPrices({ getPayPalTable: () => goodPayPal(), configDir: dir, log: () => {} });
    expect(result).toEqual({ exitCode: 0, problems: 0 });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('PayPal: exit 1 and a fix hint when a price differs', () => {
    const dir = dirWith([]);
    const lines = [];
    const table = goodPayPal();
    table.USD['1_child'] = 151;
    const result = verifyPayPalPrices({ getPayPalTable: () => table, configDir: dir, log: (l) => lines.push(l) });
    expect(result.exitCode).toBe(1);
    expect(lines.join('\n')).toMatch(/PayPal prices come from config\/familyPlanPricing\.js/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('PayPal: an old PayPal price file left behind fails it, a PagBank one does not (its own command checks that)', () => {
    const dir = dirWith(['paypalFamilyPlanPrices.json', 'pagseguroFamilyPlanPrices.json']);
    const result = verifyPayPalPrices({ getPayPalTable: () => goodPayPal(), configDir: dir, log: () => {} });
    expect(result).toEqual({ exitCode: 1, problems: 1 });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('PayPal: only an old PayPal file fails it', () => {
    const dir = dirWith(['paypalFamilyPlanPrices.json']);
    const result = verifyPayPalPrices({ getPayPalTable: () => goodPayPal(), configDir: dir, log: () => {} });
    expect(result).toEqual({ exitCode: 1, problems: 1 });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('PayPal: an old PagBank file alone does not fail it (that is the PagBank command\'s business)', () => {
    const dir = dirWith(['pagseguroFamilyPlanPrices.json']);
    const result = verifyPayPalPrices({ getPayPalTable: () => goodPayPal(), configDir: dir, log: () => {} });
    expect(result).toEqual({ exitCode: 0, problems: 0 });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('PayPal: a table that cannot be built is exit 1, not a crash', () => {
    const result = verifyPayPalPrices({ getPayPalTable: () => { throw new Error('boom'); }, log: () => {} });
    expect(result.exitCode).toBe(1);
  });

  const memory = (map) => ({
    readFileSync: (f) => {
      if (!(f in map)) throw new Error(`ENOENT: ${f}`);
      return map[f];
    },
    existsSync: () => false,
  });

  it('PagBank: exit 0 when the checkout it builds and the code match', () => {
    const result = verifyPagbankPrices({
      getBuildCheckoutLineItems: () => goodBuilder,
      servicePath: '/s.js',
      configDir: '/none',
      fs: memory({ '/s.js': 'const MAX_CHILDREN = pricing.MAX_CHILDREN;' }),
      log: () => {},
    });
    expect(result).toEqual({ exitCode: 0, problems: 0 });
  });

  it('PagBank: catches the old checkout AND the old code', () => {
    const lines = [];
    const result = verifyPagbankPrices({
      getBuildCheckoutLineItems: () => (kids) => (kids === 1 ? { items: [{ unit_amount: 79900 }], totalCents: 79900 } : goodBuilder(kids)),
      servicePath: '/s.js',
      configDir: '/none',
      fs: memory({ '/s.js': 'const MAX_CHILDREN = 10; reference_id: `activity-box-1`' }),
      log: (l) => lines.push(l),
    });
    expect(result.exitCode).toBe(1);
    expect(result.problems).toBe(4); // two amount problems for 1 child + the limit + the box marker
  });

  it('PagBank: an old price file left behind fails it', () => {
    const files = new Set([path.join('/cfg', 'pagseguroFamilyPlanPrices.json')]);
    const result = verifyPagbankPrices({
      getBuildCheckoutLineItems: () => goodBuilder,
      servicePath: '/s.js',
      configDir: '/cfg',
      fs: { readFileSync: () => 'const MAX_CHILDREN = pricing.MAX_CHILDREN;', existsSync: (f) => files.has(f) },
      log: () => {},
    });
    expect(result).toEqual({ exitCode: 1, problems: 1 });
  });

  it('PagBank: code that cannot be read only skips the code checks (the checkout is still checked)', () => {
    const lines = [];
    const result = verifyPagbankPrices({ getBuildCheckoutLineItems: () => goodBuilder, servicePath: '/none.js', configDir: '/none', fs: memory({}), log: (l) => lines.push(l) });
    expect(result.exitCode).toBe(0);
    expect(lines.join('\n')).toMatch(/checks skipped/);
  });

  it('PagBank: a builder that cannot be loaded is exit 1, not a crash', () => {
    const result = verifyPagbankPrices({ getBuildCheckoutLineItems: () => { throw new Error('boom'); }, servicePath: '/none.js', configDir: '/none', fs: memory({}), log: () => {} });
    expect(result.exitCode).toBe(1);
  });
});
