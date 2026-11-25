/**
 * Offline checks that every place that knows about a Family Plan price agrees with the ONE price list
 * (config/familyPlanPricing.js). Pure functions: they take file contents / parsed config and return findings.
 * No network, no keys, no database, so they are safe to run anywhere and easy to test.
 *
 * A finding is { level: 'problem' | 'note', where: string, text: string }.
 *   problem: something would charge or allow the wrong thing
 *   note:    worth knowing, does not change what is charged
 */

const path = require('path');
const realFs = require('fs');

const pricing = require('../../services/familyPlanPricing.service');
const { FILE_BY_MODE, LEGACY_FILE } = require('../../config/stripeFamilyPlanFile');

const problem = (where, text) => ({ level: 'problem', where, text });

/**
 * Source code with its comments taken out. Code that has been switched off by commenting it out (for example the
 * activity box add-on, kept for later) must not count as "still there": only live code is checked.
 * A "//" only starts a comment at the start of a line or after a space, so "https://..." is left alone.
 */
function stripComments(source) {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}
const note = (where, text) => ({ level: 'note', where, text });

const tierKeyFor = (kids) => (kids === 1 ? '1_child' : `${kids}_children`);
const major = (cents) => cents / 100;

/**
 * PayPal: the price table the PayPal service orders from (paypalService.getPriceTable()):
 *   { USD: { "1_child": 120, "1_child_yearly": 120, ... }, BRL: {...}, EUR: {...} }
 * Every tier (and its _yearly twin) must be the ANNUAL price from the price list, for 1 to MAX children, and nothing else.
 */
function checkPayPalConfig(config) {
  const findings = [];
  const where = 'PayPal (price table in services/paypalService.js)';
  if (!config || typeof config !== 'object') return [problem(where, 'the price table is missing')];

  for (const currency of Object.keys(config)) {
    if (!pricing.CURRENCIES.includes(currency)) findings.push(problem(where, `currency ${currency} is not one we sell in (USD, BRL, EUR)`));
  }

  for (const currency of pricing.CURRENCIES) {
    const table = config[currency];
    if (!table || typeof table !== 'object') {
      findings.push(problem(where, `${currency}: no prices at all`));
      continue;
    }
    const expectedKeys = new Set();
    for (const kids of pricing.childCounts()) {
      const expected = major(pricing.getAnnualCents(currency, kids));
      for (const key of [tierKeyFor(kids), `${tierKeyFor(kids)}_yearly`]) {
        expectedKeys.add(key);
        if (typeof table[key] !== 'number') findings.push(problem(where, `${currency} ${key}: missing (expected ${expected})`));
        else if (table[key] !== expected) findings.push(problem(where, `${currency} ${key}: is ${table[key]}, the price list says ${expected}`));
      }
    }
    for (const key of Object.keys(table)) {
      if (!expectedKeys.has(key)) findings.push(problem(where, `${currency} ${key}: not part of the plan (1 to ${pricing.MAX_CHILDREN} children) but a customer could buy it`));
    }
  }
  return findings;
}

/**
 * PagBank: checked through the code that builds the checkout (pagseguro.service.buildCheckoutLineItems), because the
 * amount is sent with every checkout and there is no price file any more. For 1 to MAX children it must give exactly one
 * line equal to the BRL annual price (no box, whatever the caller passes), and it must refuse 0 and MAX + 1 children.
 */
function checkPagbankPricing({ buildCheckoutLineItems }) {
  const findings = [];
  const where = 'PagBank (services/pagseguro.service.js)';
  if (typeof buildCheckoutLineItems !== 'function') return [problem(where, 'buildCheckoutLineItems is missing')];

  for (const kids of pricing.childCounts()) {
    const expected = pricing.getAnnualCents('BRL', kids);
    let built;
    try {
      built = buildCheckoutLineItems(kids, true); // true = what an old caller passed for the box
    } catch (err) {
      findings.push(problem(where, `${kids} children: cannot be built (${err.message})`));
      continue;
    }
    if (!built || built.totalCents !== expected) findings.push(problem(where, `${kids} children: total is ${built && built.totalCents} centavos, the price list says ${expected}`));
    if (!built || !Array.isArray(built.items) || built.items.length !== 1) {
      findings.push(problem(where, `${kids} children: ${built && built.items ? built.items.length : 0} line items, expected exactly one (no box)`));
    } else if (built.items[0].unit_amount !== expected) {
      findings.push(problem(where, `${kids} children: the line is ${built.items[0].unit_amount} centavos, the price list says ${expected}`));
    }
  }
  for (const kids of [pricing.MIN_CHILDREN - 1, pricing.MAX_CHILDREN + 1]) {
    let refused = false;
    try {
      buildCheckoutLineItems(kids);
    } catch (err) {
      refused = true;
    }
    if (!refused) findings.push(problem(where, `${kids} children is accepted: it is not part of the plan (1 to ${pricing.MAX_CHILDREN}) but a customer could buy it`));
  }
  return findings;
}

/**
 * The old per-provider price files must be gone: nothing reads them any more, and a stale copy invites someone to
 * "fix" a price there instead of in the one price list.
 */
function checkOldPriceFilesGone({ dir, fs = realFs }) {
  return ['paypalFamilyPlanPrices.json', 'pagseguroFamilyPlanPrices.json']
    .filter((name) => fs.existsSync(path.join(dir, name)))
    .map((name) => problem(`config/${name}`, 'an old price file still exists. Nothing reads it any more (prices come from config/familyPlanPricing.js): delete it'));
}

/**
 * A price table inside a screen's checkoutService.js, e.g.
 *   const PLAN_PRICES_BR = { 1: { installment: '...', cash: 799, amount: 799, ... }, ... }
 * Returns { kids: amount } or null when that table is not in the file (which is the goal once screens read the API).
 */
function readSiteTable(rawSource, name) {
  const source = stripComments(rawSource);
  const start = source.indexOf(`const ${name} = {`);
  if (start === -1) return null;
  const end = source.indexOf('\n}', start);
  const body = source.slice(start, end === -1 ? undefined : end);
  const table = {};
  for (const match of body.matchAll(/(\d+):\s*\{[^}]*?\bamount:\s*(\d+)/g)) table[Number(match[1])] = Number(match[2]);
  return table;
}

const SITE_TABLES = [['br', 'PLAN_PRICES_BR'], ['us', 'PLAN_PRICES_USD'], ['eu', 'PLAN_PRICES_EUR']];

/** A screen's own price tables must equal the price list (annual, whole currency units), 1 to MAX children, or not exist. */
function checkSiteTables(source, where) {
  const findings = [];
  let found = 0;
  for (const [region, name] of SITE_TABLES) {
    const table = readSiteTable(source, name);
    if (table === null) continue;
    found += 1;
    for (const kids of pricing.childCounts()) {
      const expected = major(pricing.getAnnualCents(region, kids));
      if (table[kids] === undefined) findings.push(problem(where, `${name} ${kids} children: missing (expected ${expected})`));
      else if (table[kids] !== expected) findings.push(problem(where, `${name} ${kids} children: shows ${table[kids]}, the price list says ${expected}`));
    }
    const extra = Object.keys(table).filter((kids) => !pricing.childCounts().includes(Number(kids)));
    if (extra.length > 0) findings.push(problem(where, `${name} ${extra.join(', ')} children: not part of the plan (1 to ${pricing.MAX_CHILDREN}) but the screen offers them`));
  }
  if (found === 0) findings.push(note(where, 'has no price table of its own'));
  return findings;
}

/** `const NAME = 10` style limits in source: every one found must equal MAX_CHILDREN. */
function checkChildLimitInSource(rawSource, where, names) {
  const source = stripComments(rawSource);
  const findings = [];
  let seen = 0;
  for (const name of names) {
    // The limit read from the one price list (const MAX_CHILDREN = pricing.MAX_CHILDREN) is the right answer
    if (new RegExp(`\\b${name}\\s*=\\s*pricing\\.MAX_CHILDREN\\b`).test(source)) {
      seen += 1;
      continue;
    }
    const match = source.match(new RegExp(`\\b${name}\\s*=\\s*(\\d+)`));
    if (!match) continue;
    seen += 1;
    if (Number(match[1]) !== pricing.MAX_CHILDREN) findings.push(problem(where, `${name} is ${match[1]}, the plan allows ${pricing.MAX_CHILDREN} children at most`));
  }
  if (seen === 0) findings.push(note(where, `no ${names.join(' / ')} found (nothing to check)`));
  return findings;
}

/** The activity box add-on no longer exists: its markers must be gone from checkout code. */
function checkNoBoxInSource(rawSource, where, markers) {
  const source = stripComments(rawSource);
  return markers.filter((marker) => source.includes(marker)).map((marker) => problem(where, `still mentions "${marker}": the activity box add-on no longer exists`));
}

/**
 * A screen must not hold a price table of its own any more: its prices come from the backend. Any of these names
 * in its code means a table (or the box price) has crept back.
 */
function checkNoPriceTablesInSource(rawSource, where, markers) {
  const source = stripComments(rawSource);
  return markers
    .filter((marker) => source.includes(marker))
    .map((marker) => problem(where, `still holds "${marker}": prices come from the backend (GET /api/checkout/pricing), a screen must not keep its own`));
}

/**
 * Checkout texts (translations) must not have a price typed into them ("ou R$799 à vista"): the page shows the price from
 * the backend, and the texts around it must not contradict it. `texts` is { pt: {...}, en: {...}, es: {...} } of the
 * parsed translation files; only the "checkout" part is looked at.
 */
function checkNoPricesInTranslations(texts, where = 'checkout translations') {
  const findings = [];
  const walk = (value, trail, lang) => {
    if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${trail}[${i}]`, lang));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, inner]) => walk(inner, `${trail}.${key}`, lang));
    else if (typeof value === 'string' && /(R\$|[$€])\s?\d/.test(value)) {
      findings.push(problem(`${where} (${lang})`, `${trail} has a price typed in: "${value}"`));
    }
  };
  for (const [lang, content] of Object.entries(texts || {})) walk(content?.checkout, 'checkout', lang);
  return findings;
}

/**
 * Stripe price-id files in config/: the per-mode files must have an id for every cell; the old shared file is only a note.
 */
function checkStripeFiles({ dir, fs = realFs }) {
  const findings = [];
  const read = (name) => {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      findings.push(problem(`Stripe (${name})`, `could not be read: ${err.message}`));
      return undefined;
    }
  };

  for (const mode of ['live', 'test']) {
    const name = FILE_BY_MODE[mode];
    const data = read(name);
    if (data === null) {
      findings.push(note(`Stripe (${name})`, mode === 'live' ? 'not created yet: live checkout has no prices until createStripePrices.js is run with the live key' : 'not created yet'));
      continue;
    }
    if (data === undefined) continue;
    for (const cell of pricing.listPriceCells()) {
      if (!data.prices?.[cell.region]?.[cell.kids]) findings.push(problem(`Stripe (${name})`, `${cell.region} ${cell.kids} children: no price id`));
    }
    for (const [region, byKids] of Object.entries(data.prices || {})) {
      for (const kids of Object.keys(byKids || {})) {
        if (!pricing.childCounts().includes(Number(kids))) findings.push(note(`Stripe (${name})`, `${region} ${kids} children: id for a size that is not sold`));
      }
    }
  }
  const legacy = read(LEGACY_FILE);
  if (legacy) findings.push(note(`Stripe (${LEGACY_FILE})`, 'the OLD shared file still exists; only test keys and no-key setups read it (never a live key). Replace it by running createStripePrices.js'));
  return findings;
}

/** Prints findings grouped under a title; returns the number of problems. */
function printFindings(title, findings, log) {
  const problems = findings.filter((f) => f.level === 'problem');
  const notes = findings.filter((f) => f.level === 'note');
  log(`${problems.length === 0 ? 'PASS' : 'FAIL'}  ${title}${problems.length ? `  (${problems.length} problem${problems.length > 1 ? 's' : ''})` : ''}`);
  for (const f of problems) log(`        PROBLEM  ${f.where}: ${f.text}`);
  for (const f of notes) log(`        note     ${f.where}: ${f.text}`);
  return problems.length;
}

module.exports = {
  checkPayPalConfig,
  checkPagbankPricing,
  checkOldPriceFilesGone,
  readSiteTable,
  checkSiteTables,
  checkChildLimitInSource,
  checkNoBoxInSource,
  checkNoPriceTablesInSource,
  checkNoPricesInTranslations,
  checkStripeFiles,
  printFindings,
  stripComments,
  tierKeyFor,
};
