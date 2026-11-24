/**
 * Checks every Stripe price the checkout uses against the Stripe account the current STRIPE_SECRET_KEY belongs to.
 * READ ONLY: it only retrieves prices, it never creates or changes anything in Stripe.
 *
 * Run from backend:  npm run stripe:verify-prices
 *
 * It reports, for each price in config/stripeFamilyPlanPrices.json (and STRIPE_PRICE_ID_YEARLY if set):
 *   OK       the price exists in this Stripe account/mode, is active, and has the expected currency + product
 *   PROBLEM  the price is missing ("No such price"), inactive, in another mode, in the wrong currency or on another product
 *
 * The usual cause of "No such price" on the live site: the price ids in the JSON were created with a TEST key
 * (sk_test_...), but the server runs a LIVE key (sk_live_...). Test and live have different prices.
 * Fix: run `node scripts/createStripePrices.js` once with the LIVE key, then deploy the new JSON.
 *
 * Exit code: 0 when every price is fine, 1 when anything needs attention.
 */

const path = require('path');
const fs = require('fs');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv not installed or .env missing; rely on process.env
}

const Stripe = require('stripe');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'stripeFamilyPlanPrices.json');
const EXPECTED_CURRENCY = { br: 'brl', us: 'usd', eu: 'eur' };

/** "live", "test" or "unknown", from the key itself (the key is never printed). */
function keyMode(key) {
  if (/^(sk|rk)_live_/.test(key || '')) return 'live';
  if (/^(sk|rk)_test_/.test(key || '')) return 'test';
  return 'unknown';
}

/** Every price id to check, with where it came from: [{ label, id, region? , expectedProduct? }]. */
function collectPrices(config, yearlyPriceId) {
  const list = [];
  for (const [region, byKids] of Object.entries(config.prices || {})) {
    for (const [kids, id] of Object.entries(byKids || {})) {
      list.push({ label: `${region} ${kids} kid${kids === '1' ? '' : 's'}`, id, region, expectedProduct: config.productId });
    }
  }
  if (yearlyPriceId) list.push({ label: 'STRIPE_PRICE_ID_YEARLY (env)', id: yearlyPriceId });
  return list;
}

/** What is wrong with a price Stripe returned (empty list = fine). */
function problemsWithPrice(entry, price, mode) {
  const problems = [];
  if (!price.active) problems.push('the price is archived (inactive)');
  if (mode === 'live' && price.livemode === false) problems.push('it is a TEST price but the key is LIVE');
  if (mode === 'test' && price.livemode === true) problems.push('it is a LIVE price but the key is TEST');
  const wantCurrency = entry.region ? EXPECTED_CURRENCY[entry.region] : null;
  if (wantCurrency && price.currency !== wantCurrency) problems.push(`currency is ${price.currency}, expected ${wantCurrency}`);
  const product = typeof price.product === 'string' ? price.product : price.product?.id;
  if (entry.expectedProduct && product !== entry.expectedProduct) problems.push(`it belongs to product ${product}, expected ${entry.expectedProduct}`);
  if (entry.region && price.metadata?.region && price.metadata.region !== entry.region) {
    problems.push(`its region tag is ${price.metadata.region}, expected ${entry.region}`);
  }
  return problems;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Missing STRIPE_SECRET_KEY in the environment (.env).');
    process.exit(1);
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Missing ${CONFIG_PATH}. Run: node scripts/createStripePrices.js`);
    process.exit(1);
  }

  const mode = keyMode(key);
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const stripe = new Stripe(key);

  console.log(`Stripe key mode: ${mode.toUpperCase()}`);
  console.log(`Product in config: ${config.productId || '(none)'}\n`);

  const entries = collectPrices(config, process.env.STRIPE_PRICE_ID_YEARLY);
  let bad = 0;

  for (const entry of entries) {
    try {
      const price = await stripe.prices.retrieve(entry.id);
      const problems = problemsWithPrice(entry, price, mode);
      const amount = price.unit_amount != null ? (price.unit_amount / 100).toFixed(2) : '?';
      if (problems.length === 0) {
        console.log(`OK       ${entry.label.padEnd(30)} ${entry.id}  ${amount} ${String(price.currency).toUpperCase()}`);
      } else {
        bad += 1;
        console.log(`PROBLEM  ${entry.label.padEnd(30)} ${entry.id}  ${problems.join('; ')}`);
      }
    } catch (err) {
      bad += 1;
      // Stripe's own message says when "a similar object exists in test mode, but a live mode key was used"
      console.log(`PROBLEM  ${entry.label.padEnd(30)} ${entry.id}  ${err.message}`);
    }
  }

  console.log(`\nChecked ${entries.length} price(s): ${entries.length - bad} fine, ${bad} need attention.`);
  if (bad > 0) {
    console.log(
      '\nIf the problems say "No such price" or "test mode", the ids in config/stripeFamilyPlanPrices.json belong to a ' +
        'different Stripe mode/account than this key.\nFix: with the LIVE key set, run  node scripts/createStripePrices.js  ' +
        '(it reuses prices that already exist and only creates the missing ones), then deploy the updated JSON.'
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { keyMode, collectPrices, problemsWithPrice };
