/**
 * Creates the Family Plan prices in Stripe, from the ONE price list (config/familyPlanPricing.js).
 * Amounts are never typed here: change a price in the price list, run this again.
 *
 *   node scripts/createStripePrices.js --dry-run              show exactly what would happen (Stripe is only READ)
 *   node scripts/createStripePrices.js                        create the missing prices (test key)
 *   node scripts/createStripePrices.js --confirm              same, with a LIVE key (live refuses without --confirm)
 *
 * Options
 *   --dry-run             change nothing in Stripe, write no file, only report
 *   --confirm             required to create prices with a LIVE key (sk_live_ / rk_live_)
 *   --include-monthly     also prepare the 12-payment monthly prices (recurring, every month). Off by default: monthly is not on sale.
 *   --archive-mismatched  a price with the right tags but a WRONG amount/currency is archived and recreated
 *                         (Stripe prices cannot be edited). Without this flag the script stops and lists them.
 *   --archive-unused      archive tagged prices that are not part of the plan any more (for example 5 to 10 children)
 *   --help
 *
 * What it does
 *   1. Finds the Stripe product named "RiseUpKids" (or STRIPE_FAMILY_PLAN_PRODUCT_NAME). It must already exist.
 *   2. Reads the product's ACTIVE prices. A price counts only if it has our tags (region, kids; interval).
 *      Prices without our tags (for example a placeholder price made by hand) are left completely alone.
 *   3. For every region x children (1 to 4): reuse the right price, create a missing one, or stop on a wrong one.
 *   4. Writes config/stripeFamilyPlanPrices.live.json or .test.json (by the kind of key) with the price ids.
 *
 * Safe to run again: it reuses what is right. Needs STRIPE_SECRET_KEY (.env or environment). The key is never printed.
 * Exit code 0 = done / nothing to do, 1 = something needs attention (nothing is written when it stops early).
 */

const path = require('path');
const fs = require('fs');

const pricing = require('../services/familyPlanPricing.service');
const { keyMode, filePathForMode, loadFamilyPlanConfig } = require('../config/stripeFamilyPlanFile');

const DEFAULT_PRODUCT_NAME = 'RiseUpKids';

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

const HELP = [
  'Usage: node scripts/createStripePrices.js [--dry-run] [--confirm] [--include-monthly] [--archive-mismatched] [--archive-unused]',
  '  --dry-run             only report what would happen; changes nothing in Stripe, writes no file',
  '  --confirm             required to create prices with a LIVE key',
  '  --include-monthly     also prepare the 12-payment monthly prices (not on sale yet)',
  '  --archive-mismatched  archive and recreate a price whose amount or currency is wrong',
  '  --archive-unused      archive tagged prices that are no longer part of the plan (e.g. 5-10 children)',
].join('\n');

function parseArgs(argv) {
  const options = { dryRun: false, confirm: false, includeMonthly: false, archiveMismatched: false, archiveUnused: false, help: false };
  for (const arg of argv) {
    switch (arg) {
      case '--dry-run': options.dryRun = true; break;
      case '--confirm': options.confirm = true; break;
      case '--include-monthly': options.includeMonthly = true; break;
      case '--archive-mismatched': options.archiveMismatched = true; break;
      case '--archive-unused': options.archiveUnused = true; break;
      case '--help': case '-h': options.help = true; break;
      default: throw new UsageError(`Unknown option: ${arg}\n${HELP}`);
    }
  }
  return options;
}

const nicknameFor = (cell) => `${cell.kids}_children_${cell.currency}${cell.interval === 'monthly' ? '_monthly' : ''}`;
const cellKey = (region, kids, interval) => `${region}|${kids}|${interval}`;

/** The tags we put on every price we create. */
const tagsFor = (cell) => ({ kids: String(cell.kids), region: cell.region, interval: cell.interval });

/** Reads our tags off a Stripe price: { region, kids, interval } or null when it is not one of ours (an untagged price). */
function tagsOf(price) {
  const region = price?.metadata?.region;
  const kids = Number(price?.metadata?.kids);
  if (!region || !Number.isInteger(kids)) return null;
  // Prices made by the older version of this script have no interval tag: one-time = annual
  const interval = price.metadata.interval || (price.recurring ? 'monthly' : 'annual');
  return { region, kids, interval };
}

/** Why a price is not right for its cell (empty list = right). */
function problemsWith(price, cell) {
  const problems = [];
  if (price.unit_amount !== cell.cents) problems.push(`amount is ${price.unit_amount}, expected ${cell.cents}`);
  if (String(price.currency).toLowerCase() !== cell.currency.toLowerCase()) problems.push(`currency is ${price.currency}, expected ${cell.currency.toLowerCase()}`);
  if (cell.interval === 'annual' && price.recurring) problems.push('it is a recurring price, expected a one-time price');
  if (cell.interval === 'monthly' && !(price.recurring && price.recurring.interval === 'month' && (price.recurring.interval_count || 1) === 1)) {
    problems.push('it is not billed every month');
  }
  return problems;
}

/**
 * Decides what to do. Pure: no Stripe calls.
 * @param {object[]} existing  active Stripe prices of the product
 * @param {{ includeMonthly: boolean }} options
 * @returns {{ actions: object[], unused: object[], untagged: object[], blocked: object[] }}
 *   actions: { type: 'reuse'|'create'|'replace'|'blocked', cell, priceId?, replaces?: [{id, problems}] }
 */
function planPriceActions(existing, { includeMonthly = false } = {}) {
  const allCells = pricing.listPriceCells({ includeMonthly: true });
  const cellByKey = new Map(allCells.map((cell) => [cellKey(cell.region, cell.kids, cell.interval), cell]));
  const requested = allCells.filter((cell) => includeMonthly || cell.interval === 'annual');

  const correct = new Map();
  const wrong = new Map();
  const unused = [];
  const untagged = [];

  for (const price of existing) {
    const tags = tagsOf(price);
    if (!tags) {
      untagged.push(price);
      continue;
    }
    const key = cellKey(tags.region, tags.kids, tags.interval);
    const cell = cellByKey.get(key);
    if (!cell) {
      unused.push(price);
      continue;
    }
    const problems = problemsWith(price, cell);
    const bucket = problems.length === 0 ? correct : wrong;
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key).push({ id: price.id, problems });
  }

  const actions = [];
  for (const cell of requested) {
    const key = cellKey(cell.region, cell.kids, cell.interval);
    const goods = correct.get(key) || [];
    const bads = wrong.get(key) || [];
    if (goods.length > 0) actions.push({ type: 'reuse', cell, priceId: goods[0].id, stale: bads });
    else if (bads.length > 0) actions.push({ type: 'blocked', cell, replaces: bads });
    else actions.push({ type: 'create', cell });
  }
  return { actions, unused, untagged, blocked: actions.filter((a) => a.type === 'blocked') };
}

const money = (cell) => `${(cell.cents / 100).toFixed(2)} ${cell.currency}`;
const label = (cell) => `${cell.region} ${cell.kids} ${cell.kids === 1 ? 'child ' : 'children'} ${cell.interval === 'annual' ? 'annual ' : 'monthly'}`;

async function listAll(listFn, params) {
  const out = [];
  let startingAfter;
  for (;;) {
    const page = await listFn({ ...params, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    out.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return out;
}

async function findProduct(stripe, name) {
  const products = (await listAll((p) => stripe.products.list(p), { active: true })).filter((p) => p.name === name);
  if (products.length === 0) {
    throw new Error(
      `Product "${name}" not found in this Stripe account (check you are using the right key: live and test are separate). ` +
        'Create it in the Stripe Dashboard first (Product catalog > Add product, one placeholder price is enough), ' +
        'or set STRIPE_FAMILY_PLAN_PRODUCT_NAME to the name it already has.'
    );
  }
  if (products.length > 1) {
    throw new Error(`More than one active product is named "${name}" (${products.map((p) => p.id).join(', ')}). Archive the extra ones so there is exactly one.`);
  }
  return products[0];
}

/**
 * The whole run. `stripe` is injected so tests use a fake; the command line passes the real client.
 * @returns {Promise<{ exitCode: number, wrote: boolean, created: number, reused: number, archived: number }>}
 */
async function runCreatePrices({ stripe, secretKey, options, productName = DEFAULT_PRODUCT_NAME, configDir = path.join(__dirname, '..', 'config'), fsImpl = fs, log = console.log }) {
  const result = { exitCode: 0, wrote: false, created: 0, reused: 0, archived: 0 };
  const mode = keyMode(secretKey);
  if (mode === 'unknown') {
    log('STRIPE_SECRET_KEY must start with sk_live_ or sk_test_ (or rk_live_ / rk_test_).');
    return { ...result, exitCode: 1 };
  }

  log(`Stripe key mode: ${mode.toUpperCase()}${options.dryRun ? '   (DRY RUN: nothing will be changed)' : ''}`);
  const product = await findProduct(stripe, productName);
  log(`Product: ${product.name} (${product.id})`);

  const existing = await listAll((p) => stripe.prices.list(p), { product: product.id, active: true });
  const plan = planPriceActions(existing, { includeMonthly: options.includeMonthly });

  log('');
  for (const action of plan.actions) {
    const text = label(action.cell).padEnd(26) + money(action.cell).padStart(14);
    if (action.type === 'reuse') log(`  REUSE     ${text}  ${action.priceId}`);
    else if (action.type === 'create') log(`  CREATE    ${text}`);
    else log(`  WRONG     ${text}  ${action.replaces.map((r) => `${r.id}: ${r.problems.join('; ')}`).join(' | ')}`);
  }
  if (plan.untagged.length) log(`\n  Left alone (no region/kids tag, e.g. a placeholder price): ${plan.untagged.map((p) => p.id).join(', ')}`);
  if (plan.unused.length) {
    log(`  Not part of the plan any more: ${plan.unused.map((p) => `${p.id} (${p.metadata.region} ${p.metadata.kids})`).join(', ')}` +
      `${options.archiveUnused ? '  -> will be archived' : '  (use --archive-unused to archive them)'}`);
  }
  const stale = plan.actions.flatMap((a) => (a.type === 'reuse' ? a.stale : []));
  if (stale.length) log(`  Older wrong duplicates next to a right price: ${stale.map((s) => s.id).join(', ')}${options.archiveMismatched ? '  -> will be archived' : '  (use --archive-mismatched)'}`);

  const toCreate = plan.actions.filter((a) => a.type === 'create' || (a.type === 'blocked' && options.archiveMismatched));
  const toArchive = [
    ...plan.actions.filter((a) => a.type === 'blocked' && options.archiveMismatched).flatMap((a) => a.replaces),
    ...(options.archiveMismatched ? stale : []),
    ...(options.archiveUnused ? plan.unused.map((p) => ({ id: p.id })) : []),
  ];
  log(`\nPlan: ${plan.actions.filter((a) => a.type === 'reuse').length} to reuse, ${toCreate.length} to create, ${toArchive.length} to archive.`);

  if (plan.blocked.length > 0 && !options.archiveMismatched) {
    log(`\nSTOPPED: ${plan.blocked.length} existing price(s) have the right tags but the wrong amount or currency. Stripe prices cannot be edited.`);
    log('Run again with --archive-mismatched to archive them and create the right ones. Nothing was changed.');
    return { ...result, exitCode: 1 };
  }
  if (options.dryRun) {
    log('\nDry run finished. Nothing was changed and no file was written.');
    return result;
  }
  if (mode === 'live' && !options.confirm) {
    log('\nSTOPPED: this is a LIVE key and the plan above would change your real Stripe account. Check it, then run again with --confirm.');
    return { ...result, exitCode: 1 };
  }

  let failures = 0;
  const attempt = async (what, fn) => {
    try {
      await fn();
      return true;
    } catch (err) {
      failures += 1;
      log(`  FAILED    ${what}: ${err.message}`);
      return false;
    }
  };

  for (const item of toArchive) {
    if (await attempt(`archive ${item.id}`, () => stripe.prices.update(item.id, { active: false }))) {
      result.archived += 1;
      log(`  ARCHIVED  ${item.id}`);
    }
  }

  const ids = new Map();
  for (const action of plan.actions) if (action.type === 'reuse') ids.set(cellKey(action.cell.region, action.cell.kids, action.cell.interval), action.priceId);
  result.reused = plan.actions.filter((a) => a.type === 'reuse').length;

  for (const action of toCreate) {
    const cell = action.cell;
    const params = {
      product: product.id,
      currency: cell.currency.toLowerCase(),
      unit_amount: cell.cents,
      nickname: nicknameFor(cell),
      metadata: tagsFor(cell),
      ...(cell.interval === 'monthly' ? { recurring: { interval: 'month' } } : {}),
    };
    let created;
    if (await attempt(`create ${label(cell).trim()}`, async () => { created = await stripe.prices.create(params); })) {
      ids.set(cellKey(cell.region, cell.kids, cell.interval), created.id);
      result.created += 1;
      log(`  CREATED   ${label(cell).padEnd(26)} ${created.id}`);
    }
  }

  if (failures > 0) {
    log(`\n${failures} step(s) failed (see FAILED above). Nothing was written to the price file. Fix the cause and run again: what already worked is reused.`);
    log('Common cause: your Stripe account does not accept one of the currencies (BRL, USD, EUR). Check Settings in the Stripe Dashboard.');
    return { ...result, exitCode: 1 };
  }

  const build = (interval) => {
    const out = { br: {}, us: {}, eu: {} };
    for (const cell of pricing.listPriceCells({ includeMonthly: true })) {
      const id = ids.get(cellKey(cell.region, cell.kids, cell.interval));
      if (id && cell.interval === interval) out[cell.region][cell.kids] = id;
    }
    return out;
  };
  const target = filePathForMode(mode, configDir);
  const before = loadFamilyPlanConfig({ secretKey, dir: configDir, fs: fsImpl });
  const hasAnyId = (byRegion) => Object.values(byRegion || {}).some((byKids) => Object.keys(byKids || {}).length > 0);
  const keepMonthly = !options.includeMonthly && before.source === 'mode-file' && hasAnyId(before.monthlyPrices) ? before.monthlyPrices : null;
  const file = { productId: product.id, mode, prices: build('annual') };
  const monthly = options.includeMonthly ? build('monthly') : keepMonthly;
  if (monthly) file.monthlyPrices = monthly;
  fsImpl.writeFileSync(target, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  result.wrote = true;
  log(`\nDone. Price ids saved to config/${path.basename(target)}.`);
  log('Next: run "npm run stripe:verify-prices", compare a price or two in the Stripe Dashboard by eye, then deploy this file with the code.');
  return result;
}

async function main() {
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  } catch (e) {
    // dotenv not installed or .env missing; rely on process.env
  }
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (options.help) {
    console.log(HELP);
    return;
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('Missing STRIPE_SECRET_KEY in the environment (.env).');
    process.exit(1);
  }
  const Stripe = require('stripe');
  const { exitCode } = await runCreatePrices({
    stripe: new Stripe(secretKey),
    secretKey,
    options,
    productName: process.env.STRIPE_FAMILY_PLAN_PRODUCT_NAME || DEFAULT_PRODUCT_NAME,
  });
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { UsageError, parseArgs, tagsOf, problemsWith, planPriceActions, runCreatePrices, nicknameFor };
