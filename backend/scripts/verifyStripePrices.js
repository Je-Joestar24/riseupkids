/**
 * Checks the Stripe prices the checkout uses against the ONE price list (config/familyPlanPricing.js)
 * and against the Stripe account the current STRIPE_SECRET_KEY belongs to.
 * READ ONLY: it only retrieves prices, it never creates or changes anything in Stripe.
 *
 *   npm run stripe:verify-prices
 *
 * For every price id in the price file for this kind of key (config/stripeFamilyPlanPrices.live.json or .test.json):
 *   OK       exists in this account/mode, is active, the amount and currency match the price list, one-time (annual)
 *            or monthly as expected, on the right product, tagged with the right region and children
 *   PROBLEM  missing ("No such price"), archived, test price on a live key (or the other way round), wrong amount or
 *            currency, wrong product, a cell of the plan with no price id at all
 *   NOTE     things worth knowing that do not break checkout (ids for 5+ children that are no longer sold)
 *
 * Fix for a problem: run  node scripts/createStripePrices.js --dry-run  (then without it / with --confirm on live).
 * Exit code: 0 = every price is fine, 1 = something needs attention.
 */

const path = require('path');

const pricing = require('../services/familyPlanPricing.service');
const { keyMode, loadFamilyPlanConfig } = require('../config/stripeFamilyPlanFile');

const money = (cell) => `${(cell.cents / 100).toFixed(2)} ${cell.currency}`;
const label = (cell) => `${cell.region} ${cell.kids} ${cell.kids === 1 ? 'child ' : 'children'} ${cell.interval === 'annual' ? 'annual ' : 'monthly'}`;

/** What is wrong with one Stripe price for the cell it should fill (empty = fine). */
function problemsWithPrice({ cell, price, mode, productId }) {
  const problems = [];
  if (!price.active) problems.push('the price is archived (inactive)');
  if (mode === 'live' && price.livemode === false) problems.push('it is a TEST price but the key is LIVE');
  if (mode === 'test' && price.livemode === true) problems.push('it is a LIVE price but the key is TEST');
  if (price.unit_amount !== cell.cents) problems.push(`amount is ${price.unit_amount}, the price list says ${cell.cents}`);
  if (String(price.currency).toLowerCase() !== cell.currency.toLowerCase()) problems.push(`currency is ${price.currency}, expected ${cell.currency.toLowerCase()}`);
  if (cell.interval === 'annual' && price.recurring) problems.push('it is a recurring price, but annual is paid once');
  if (cell.interval === 'monthly' && !(price.recurring && price.recurring.interval === 'month' && (price.recurring.interval_count || 1) === 1)) {
    problems.push('it is not billed every month');
  }
  const product = typeof price.product === 'string' ? price.product : price.product?.id;
  if (productId && product !== productId) problems.push(`it belongs to product ${product}, the file says ${productId}`);
  const tagRegion = price.metadata?.region;
  const tagKids = price.metadata?.kids;
  if (tagRegion && tagRegion !== cell.region) problems.push(`its region tag is ${tagRegion}, expected ${cell.region}`);
  if (tagKids && String(tagKids) !== String(cell.kids)) problems.push(`its children tag is ${tagKids}, expected ${cell.kids}`);
  return problems;
}

/**
 * @returns {Promise<{ exitCode: number, ok: number, problems: number, notes: number }>}
 */
async function verifyStripePrices({ stripe, secretKey, configDir, legacyYearlyPriceId, log = console.log, fs }) {
  const result = { exitCode: 0, ok: 0, problems: 0, notes: 0 };
  const mode = keyMode(secretKey);
  const config = loadFamilyPlanConfig({ secretKey, ...(configDir ? { dir: configDir } : {}), ...(fs ? { fs } : {}) });

  log(`Stripe key mode: ${mode.toUpperCase()}`);
  if (config.error || config.source === 'none') {
    log(`PROBLEM  ${config.error || 'No price file found. Run: node scripts/createStripePrices.js --dry-run'}`);
    return { ...result, problems: 1, exitCode: 1 };
  }
  log(`Price file: ${path.basename(config.file)}${config.source === 'legacy-file' ? '   (the OLD shared file; run createStripePrices.js to make a per-mode file)' : ''}`);
  log(`Product in file: ${config.productId || '(none)'}\n`);

  const problem = (text) => {
    result.problems += 1;
    log(`PROBLEM  ${text}`);
  };

  const hasMonthly = Object.values(config.monthlyPrices || {}).some((byKids) => Object.keys(byKids || {}).length > 0);
  const cells = pricing.listPriceCells({ includeMonthly: hasMonthly });
  const known = new Set();

  for (const cell of cells) {
    const table = cell.interval === 'annual' ? config.prices : config.monthlyPrices;
    const id = table?.[cell.region]?.[cell.kids];
    known.add(`${cell.interval}|${cell.region}|${cell.kids}`);
    if (!id) {
      problem(`${label(cell).padEnd(26)} no price id in the file (expected ${money(cell)})`);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(id);
      const problems = problemsWithPrice({ cell, price, mode, productId: config.productId });
      if (problems.length === 0) {
        result.ok += 1;
        log(`OK       ${label(cell).padEnd(26)} ${money(cell).padStart(14)}  ${id}`);
      } else {
        problem(`${label(cell).padEnd(26)} ${id}  ${problems.join('; ')}`);
      }
    } catch (err) {
      // Stripe's own text says when "a similar object exists in test mode, but a live mode key was used"
      problem(`${label(cell).padEnd(26)} ${id}  ${err.message}`);
    }
  }

  for (const [interval, table] of [['annual', config.prices], ['monthly', config.monthlyPrices]]) {
    for (const [region, byKids] of Object.entries(table || {})) {
      for (const kids of Object.keys(byKids || {})) {
        if (!known.has(`${interval}|${region}|${Number(kids)}`)) {
          result.notes += 1;
          log(`NOTE     ${region} ${kids} children ${interval}: id in the file but not part of the plan (1 to ${pricing.MAX_CHILDREN} children); it is not sold and can be removed`);
        }
      }
    }
  }

  if (legacyYearlyPriceId) {
    try {
      await stripe.prices.retrieve(legacyYearlyPriceId);
    } catch (err) {
      result.notes += 1;
      log(`NOTE     STRIPE_PRICE_ID_YEARLY (env) ${legacyYearlyPriceId}: ${err.message}\n         It is only used by the older single-price subscription flow, not by the Family Plan checkout.`);
    }
  }

  log(`\nChecked ${cells.length} price(s): ${result.ok} fine, ${result.problems} need attention${result.notes ? `, ${result.notes} note(s)` : ''}.`);
  if (result.problems > 0) {
    result.exitCode = 1;
    log(
      '\nFix: with the right key set, run  node scripts/createStripePrices.js --dry-run  to see the plan, then run it without --dry-run ' +
        '(add --confirm on a LIVE key; add --archive-mismatched if it reports a wrong amount). Then run this check again.'
    );
  }
  return result;
}

async function main() {
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  } catch (e) {
    // dotenv not installed or .env missing; rely on process.env
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('Missing STRIPE_SECRET_KEY in the environment (.env).');
    process.exit(1);
  }
  const Stripe = require('stripe');
  const { exitCode } = await verifyStripePrices({
    stripe: new Stripe(secretKey),
    secretKey,
    legacyYearlyPriceId: process.env.STRIPE_PRICE_ID_YEARLY,
  });
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { problemsWithPrice, verifyStripePrices };
