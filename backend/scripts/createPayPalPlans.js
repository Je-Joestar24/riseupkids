/**
 * Seeds PayPal product + yearly subscription plans (by currency + tier).
 * Total: 18 plans = 3 currencies × 6 tiers (1_child, 2_children, 3_children + yearly variants).
 * One-time checkout uses paypalFamilyPlanPrices.json (18 prices); this script writes plan IDs to paypalPlans.json.
 *
 * Run from backend:
 *   node scripts/createPayPalPlans.js
 *
 * Requires the following environment variables (from backend/.env or process.env):
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_API_BASE        (sandbox base: https://api-m.sandbox.paypal.com)
 *   PAYPAL_ENV=sandbox
 *
 * Reads pricing tiers from:
 *   config/paypalFamilyPlanPrices.json  (18 prices: base + yearly per currency)
 *
 * Writes resulting productId + planIds mapping to:
 *   config/paypalPlans.json
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

// Load env vars from backend/.env (same pattern as Stripe seed script).
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv not installed or .env missing; rely on process.env
}

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';

const PRICES_PATH = path.join(__dirname, '..', 'config', 'paypalFamilyPlanPrices.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'config', 'paypalPlans.json');

const PRODUCT = {
  name: 'LMS Children Subscription',
  description: 'Yearly access to the LMS platform for enrolled children',
  type: 'SERVICE',
  category: 'SOFTWARE',
};

function assertRequiredEnv() {
  const missing = [];
  if (!PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
  if (!PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
  if (!PAYPAL_API_BASE) missing.push('PAYPAL_API_BASE');

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid price amount: "${value}" (must be a positive number)`);
  }
  // PayPal expects a string with 2 decimals for fixed_price.value
  return n.toFixed(2);
}

function stableRequestId(input) {
  // PayPal-Request-Id supports a unique string to enforce idempotency.
  // We use a stable hash so re-running the script won't create duplicates.
  const hash = crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 32);
  return `riseupkids-${PAYPAL_ENV}-${hash}`;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function describeAxiosError(err) {
  // Provide a meaningful and consistent error message (status, PayPal debug id, response body).
  if (!err || typeof err !== 'object') return String(err);

  const status = err.response?.status;
  const statusText = err.response?.statusText;
  const debugId =
    err.response?.headers?.['paypal-debug-id'] ||
    err.response?.headers?.['Paypal-Debug-Id'] ||
    err.response?.headers?.['PAYPAL-DEBUG-ID'];

  const data = err.response?.data;
  const dataStr = data ? JSON.stringify(data, null, 2) : null;

  const parts = [];
  if (status) parts.push(`HTTP ${status}${statusText ? ` ${statusText}` : ''}`);
  if (debugId) parts.push(`PayPal-Debug-Id: ${debugId}`);
  if (err.message) parts.push(err.message);
  if (dataStr) parts.push(`Response:\n${dataStr}`);

  return parts.join('\n');
}

/**
 * Step 1: Authenticate using OAuth2 client credentials to obtain an access token.
 * POST /v1/oauth2/token with grant_type=client_credentials
 */
async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const body = new URLSearchParams({ grant_type: 'client_credentials' }).toString();

  try {
    const res = await axios.post(`${PAYPAL_API_BASE}/v1/oauth2/token`, body, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30_000,
    });

    if (!res.data?.access_token) {
      throw new Error(`PayPal token response missing access_token: ${JSON.stringify(res.data)}`);
    }

    return res.data.access_token;
  } catch (err) {
    throw new Error(`Failed to get PayPal access token.\n${describeAxiosError(err)}`);
  }
}

/**
 * Step 2: Create a PayPal product to attach plans to.
 * POST /v1/catalogs/products
 */
async function createProduct(accessToken) {
  try {
    const res = await axios.post(`${PAYPAL_API_BASE}/v1/catalogs/products`, PRODUCT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': stableRequestId(`product:${PRODUCT.name}`),
      },
      timeout: 30_000,
    });

    if (!res.data?.id) {
      throw new Error(`PayPal product response missing id: ${JSON.stringify(res.data)}`);
    }

    return res.data.id;
  } catch (err) {
    throw new Error(`Failed to create PayPal product.\n${describeAxiosError(err)}`);
  }
}

/**
 * Step 3: Create a yearly subscription plan per tier/currency.
 * POST /v1/billing/plans
 */
async function createPlan({ accessToken, productId, currencyCode, tierKey, amount, description }) {
  const value = formatMoney(amount);

  // Name is optional but useful in the PayPal dashboard.
  const planName = `${PRODUCT.name} - ${currencyCode} - ${tierKey}`;

  const payload = {
    product_id: productId,
    name: planName,
    description,
    billing_cycles: [
      {
        frequency: { interval_unit: 'YEAR', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            currency_code: currencyCode,
            value,
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { currency_code: currencyCode, value: '0.00' },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  };

  try {
    const res = await axios.post(`${PAYPAL_API_BASE}/v1/billing/plans`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': stableRequestId(`plan:${productId}:${currencyCode}:${tierKey}:${value}`),
      },
      timeout: 30_000,
    });

    if (!res.data?.id) {
      throw new Error(`PayPal plan response missing id: ${JSON.stringify(res.data)}`);
    }

    return res.data.id;
  } catch (err) {
    throw new Error(
      `Failed to create PayPal plan (${currencyCode} / ${tierKey} / ${value}).\n${describeAxiosError(err)}`
    );
  }
}

function buildEmptyPlanMapFromPrices(prices) {
  const out = {};
  for (const currencyCode of Object.keys(prices)) {
    out[currencyCode] = {};
    for (const tierKey of Object.keys(prices[currencyCode] || {})) {
      out[currencyCode][tierKey] = '';
    }
  }
  return out;
}

async function main() {
  assertRequiredEnv();

  if (!fs.existsSync(PRICES_PATH)) {
    console.error(`Missing pricing file: ${PRICES_PATH}`);
    process.exit(1);
  }

  const prices = JSON.parse(fs.readFileSync(PRICES_PATH, 'utf8'));

  // If we already seeded before, load existing output to skip already-created plans.
  const existingOutput = readJsonIfExists(OUTPUT_PATH);
  const existingProductId = existingOutput?.productId || '';
  const existingPlans = existingOutput?.plans || null;

  console.log(`PayPal environment: ${PAYPAL_ENV}`);
  console.log(`PayPal API base: ${PAYPAL_API_BASE}`);
  console.log(`Pricing file: ${PRICES_PATH}`);
  console.log(`Output file: ${OUTPUT_PATH}\n`);

  console.log('Authenticating with PayPal...');
  const accessToken = await getAccessToken();
  console.log('Authenticated.\n');

  let productId = existingProductId;
  if (productId) {
    console.log(`[SKIP] Using existing productId from paypalPlans.json: ${productId}\n`);
  } else {
    console.log('Creating PayPal product...');
    productId = await createProduct(accessToken);
    console.log(`Created product: ${productId}\n`);
  }

  const resultPlans = existingPlans || buildEmptyPlanMapFromPrices(prices);

  for (const [currencyCode, tiers] of Object.entries(prices)) {
    if (!tiers || typeof tiers !== 'object') continue;

    for (const [tierKey, amount] of Object.entries(tiers)) {
      if (resultPlans?.[currencyCode]?.[tierKey]) {
        console.log(`[SKIP] ${currencyCode} ${tierKey} -> ${resultPlans[currencyCode][tierKey]} (already seeded)`);
        continue;
      }

      const childrenCount = tierKey.replace('_children', '').replace('_child', '');
      const planDescription = `Yearly subscription for ${childrenCount} ${Number(childrenCount) === 1 ? 'child' : 'children'} in ${currencyCode}`;

      console.log(`[CREATE] ${currencyCode} ${tierKey} amount=${formatMoney(amount)} ...`);
      try {
        const planId = await createPlan({
          accessToken,
          productId,
          currencyCode,
          tierKey,
          amount,
          description: planDescription,
        });
        resultPlans[currencyCode] = resultPlans[currencyCode] || {};
        resultPlans[currencyCode][tierKey] = planId;
        console.log(`[CREATED] ${currencyCode} ${tierKey} -> ${planId}`);
      } catch (err) {
        console.error(`[ERROR] ${currencyCode} ${tierKey}`);
        console.error(err.message || err);
      }
    }
  }

  // Persist results even if some plan creations failed, so re-runs can continue.
  const output = { productId, plans: resultPlans };
  writeJson(OUTPUT_PATH, output);

  console.log('\n--- Saved to config/paypalPlans.json ---\n');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

