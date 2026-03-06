/**
 * Creates Stripe prices for the Family Plan product (BRL, USD, EUR).
 * Run from backend: node scripts/createStripePrices.js
 * Requires STRIPE_SECRET_KEY in .env or environment.
 * Writes product ID + price mapping to config/stripeFamilyPlanPrices.json
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

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
// Set this to match your Stripe product name exactly.
// Example: create a Stripe product named "RiseUpKids" then run the script.
const PRODUCT_NAME = process.env.STRIPE_FAMILY_PLAN_PRODUCT_NAME || 'RiseUpKids';

function buildNickname({ kids, currency }) {
  return `${kids}_children_${String(currency || '').toUpperCase()}`;
}

const PRICING = {
  br: {
    currency: 'brl',
    amounts: {
      1: 799,
      2: 1299,
      3: 1799,
      4: 2199,
      5: 2639,
      6: 3079,
      7: 3519,
      8: 3959,
      9: 4399,
      10: 4839,
    },
  },
  us: {
    currency: 'usd',
    amounts: {
      1: 799,
      2: 1598,
      3: 2397,
      4: 2199,
      5: 2749,
      6: 3299,
      7: 3849,
      8: 4399,
      9: 4949,
      10: 5499,
    },
  },
  eu: {
    currency: 'eur',
    amounts: {
      1: 799,
      2: 1598,
      3: 2397,
      4: 2199,
      5: 2749,
      6: 3299,
      7: 3849,
      8: 4399,
      9: 4949,
      10: 5499,
    },
  },
};

function getExistingPricesMap(prices) {
  const map = { br: {}, us: {}, eu: {} };
  for (const p of prices) {
    const region = p.metadata?.region;
    const kids = p.metadata?.kids;
    if (region && kids && map[region] !== undefined) {
      map[region][Number(kids)] = p.id;
    }
  }
  return map;
}

async function findProductByName(stripe) {
  const products = await stripe.products.list({ limit: 100, active: true });
  const product = products.data.find((p) => p.name === PRODUCT_NAME);
  if (!product) {
    throw new Error(`Product "${PRODUCT_NAME}" not found. Create it in Stripe first.`);
  }
  return product;
}

async function main() {
  if (!STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY in environment.');
    process.exit(1);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  console.log(`Looking for product "${PRODUCT_NAME}"...`);
  const product = await findProductByName(stripe);
  const productId = product.id;
  console.log(`Found product: ${productId}\n`);

  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  const existing = getExistingPricesMap(existingPrices.data);
  console.log('Existing prices (will skip):', JSON.stringify(existing, null, 2), '\n');

  const result = {
    br: { ...existing.br },
    us: { ...existing.us },
    eu: { ...existing.eu },
  };

  for (const [regionKey, config] of Object.entries(PRICING)) {
    const { currency, amounts } = config;
    for (let kids = 1; kids <= 10; kids++) {
      if (result[regionKey][kids]) {
        console.log(`[SKIP] ${regionKey} kids=${kids} -> ${result[regionKey][kids]} (already exists)`);
        continue;
      }
      const amount = amounts[kids];
      const unitAmount = Math.round(amount * 100);
      const price = await stripe.prices.create({
        product: productId,
        currency,
        unit_amount: unitAmount,
        nickname: buildNickname({ kids, currency }),
        metadata: {
          kids: String(kids),
          region: regionKey,
        },
      });
      result[regionKey][kids] = price.id;
      console.log(`[CREATED] ${regionKey} kids=${kids} currency=${currency} -> ${price.id}`);
    }
  }

  const config = {
    productId: productId,
    prices: result,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  console.log('\n--- Final mapping (saved to config/stripeFamilyPlanPrices.json) ---\n');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
