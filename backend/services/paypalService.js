/**
 * PayPal Service (Phase 2 – One-time checkout)
 *
 * Uses PayPal Orders API v2:
 * - Create order: POST /v2/checkout/orders (intent=CAPTURE)
 * - Capture order: POST /v2/checkout/orders/{id}/capture
 *
 * Payer ID (payer.payer_id) and capture ID are stored on the User model:
 * - paypalPayerId = payer_id from capture response (used for refunds / future APIs).
 *
 * Subscription period: one-time purchase grants 1 year access; we set
 * subscriptionStartDate = now, subscriptionCurrentPeriodEnd = now + 1 year.
 *
 * planKidsLimit and planRegion are derived from the tier (e.g. 1_child_USD → limit 1, region us).
 *
 * Pay Later (Pay in 4) is enabled automatically by PayPal when the frontend
 * uses the JS SDK; no extra backend configuration required.
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const PRICES_PATH = path.join(__dirname, '..', 'config', 'paypalFamilyPlanPrices.json');

/** Cached pricing: { USD: { "1_child": 151, ... }, BRL: { ... }, EUR: { ... } } */
let _prices = null;

function getPrices() {
  if (_prices) return _prices;
  if (!fs.existsSync(PRICES_PATH)) {
    throw new Error('PayPal pricing config not found: ' + PRICES_PATH);
  }
  _prices = JSON.parse(fs.readFileSync(PRICES_PATH, 'utf8'));
  return _prices;
}

/**
 * Parse tier string "1_child_USD" | "2_children_BRL" into { tierKey, currency }.
 * Valid tierKeys: 1_child, 2_children, 3_children. Valid currency: USD, BRL, EUR.
 */
function parseTier(tier) {
  if (!tier || typeof tier !== 'string') return null;
  const parts = tier.trim().split('_');
  if (parts.length < 2) return null;
  const currency = parts.pop().toUpperCase();
  const tierKey = parts.join('_').toLowerCase();
  const prices = getPrices();
  if (!prices[currency] || typeof prices[currency][tierKey] !== 'number') return null;
  return { tierKey, currency };
}

/**
 * Get list of valid tier strings for validation (e.g. 1_child_USD, 2_children_BRL).
 */
function getValidTiers() {
  const prices = getPrices();
  const list = [];
  for (const currency of Object.keys(prices)) {
    for (const tierKey of Object.keys(prices[currency] || {})) {
      list.push(`${tierKey}_${currency}`);
    }
  }
  return list;
}

/** Plan type for create-order: yearly (one-time when Pay in 4 not available) or pay_in_4 */
const PLAN_TYPE_YEARLY = 'yearly';
const PLAN_TYPE_PAY_IN_4 = 'pay_in_4';

function getValidPlanTypes() {
  return [PLAN_TYPE_YEARLY, PLAN_TYPE_PAY_IN_4];
}

/**
 * Build tier string from childCount, currency, and planType.
 * Use when client sends planType instead of pre-built tier.
 * @param {number} childCount - 1–10
 * @param {string} currency - USD, BRL, EUR
 * @param {string} planType - 'yearly' | 'pay_in_4'
 * @returns {string} e.g. "1_child_USD", "2_children_yearly_BRL"
 */
function buildTier(childCount, currency, planType) {
  const n = Math.min(10, Math.max(1, Number(childCount) || 1));
  const tierKey = n === 1 ? '1_child' : `${n}_children`;
  const useYearly = String(planType).toLowerCase() === PLAN_TYPE_YEARLY;
  const key = useYearly ? `${tierKey}_yearly` : tierKey;
  const cur = (currency || 'USD').toUpperCase();
  const tier = `${key}_${cur}`;
  const parsed = parseTier(tier);
  if (!parsed) throw new Error(`Invalid tier built: ${tier}. Check childCount (1–10) and currency (USD, BRL, EUR).`);
  return tier;
}

/**
 * Map currency code to planRegion (User.planRegion: br | us | eu).
 */
function currencyToPlanRegion(currency) {
  const map = { USD: 'us', BRL: 'br', EUR: 'eu' };
  return map[currency?.toUpperCase()] || 'us';
}

/**
 * Map tier key to planKidsLimit (1_child → 1, 2_children → 2, 3_children → 3).
 * Supports yearly variants: 1_child_yearly, 2_children_yearly, 3_children_yearly.
 */
function tierKeyToPlanKidsLimit(tierKey) {
  const base = (tierKey || '').replace(/_yearly$/, '');
  if (base === '1_child') return 1;
  if (base === '2_children') return 2;
  if (base === '3_children') return 3;
  const n = parseInt(base, 10);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1;
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount: ' + value);
  return n.toFixed(2);
}

function describeAxiosError(err) {
  if (!err || typeof err !== 'object') return String(err);
  const status = err.response?.status;
  const data = err.response?.data;
  const debugId = err.response?.headers?.['paypal-debug-id'];
  const parts = [];
  if (status) parts.push('HTTP ' + status);
  if (debugId) parts.push('PayPal-Debug-Id: ' + debugId);
  if (err.message) parts.push(err.message);
  if (data) parts.push(JSON.stringify(data));
  return parts.join(' | ');
}

/**
 * Fetch OAuth2 access token from PayPal (client credentials).
 * POST /v1/oauth2/token, grant_type=client_credentials
 */
async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_API_BASE) {
    throw new Error('PayPal config missing: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_BASE');
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials' }).toString();
  try {
    const res = await axios.post(`${PAYPAL_API_BASE}/v1/oauth2/token`, body, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });
    if (!res.data?.access_token) {
      throw new Error('PayPal token response missing access_token');
    }
    return res.data.access_token;
  } catch (err) {
    throw new Error('PayPal getAccessToken failed: ' + describeAxiosError(err));
  }
}

/**
 * Create a one-time PayPal order (Orders API v2).
 * Maps tier (e.g. "1_child_USD") to amount/currency via paypalFamilyPlanPrices.json.
 * custom_id is set to "{userId}_{tier}" so capture can identify user and tier.
 *
 * @param {string} tier - e.g. "1_child_USD", "2_children_BRL"
 * @param {string} userId - MongoDB user id (for custom_id)
 * @returns {Promise<{ orderID: string }>}
 */
async function createPaypalOrder(tier, userId) {
  const parsed = parseTier(tier);
  if (!parsed) {
    throw new Error('Invalid tier. Use one of: ' + getValidTiers().join(', '));
  }
  const { tierKey, currency } = parsed;
  const prices = getPrices();
  const amount = prices[currency][tierKey];
  const value = formatAmount(amount);
  const childWord = tierKey === '1_child' ? 'child' : 'children';
  const num = tierKeyToPlanKidsLimit(tierKey);
  const description = `Yearly LMS subscription for ${num} ${childWord} in ${currency}`;

  const accessToken = await getAccessToken();
  // Use pipe so we can split reliably (tier contains underscores e.g. 1_child_USD).
  const customId = `${userId}|${tier}`;

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value,
        },
        description,
        custom_id: customId,
      },
    ],
  };

  try {
    const res = await axios.post(`${PAYPAL_API_BASE}/v2/checkout/orders`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const orderID = res.data?.id;
    if (!orderID) throw new Error('PayPal create order response missing id');
    return { orderID };
  } catch (err) {
    throw new Error('PayPal createPaypalOrder failed: ' + describeAxiosError(err));
  }
}

/**
 * Capture a PayPal order and return payer_id and capture id for storing on User.
 * Validates order status (APPROVED) and that custom_id matches the requesting userId.
 * Subscription period: +1 year from now for subscriptionCurrentPeriodEnd.
 *
 * @param {string} orderID - PayPal order id
 * @param {string} userId - Requesting user id (must match custom_id in order)
 * @returns {Promise<{ payerId: string, captureId: string, tier: string }>}
 */
async function capturePaypalOrder(orderID, userId) {
  if (!orderID || !userId) {
    throw new Error('orderID and userId are required');
  }
  const accessToken = await getAccessToken();

  // Get order details first to read custom_id and validate status
  let orderRes;
  try {
    orderRes = await axios.get(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });
  } catch (err) {
    throw new Error('PayPal get order failed: ' + describeAxiosError(err));
  }

  const order = orderRes.data;
  const status = order?.status;
  const customId = order.purchase_units?.[0]?.custom_id || '';
  const [orderUserId, tierFromOrder] = customId.includes('|') ? customId.split('|') : [customId, ''];

  if (orderUserId !== userId) {
    throw new Error('Order does not belong to this user');
  }

  if (status === 'COMPLETED') {
    // Idempotent: already captured. Return existing details so caller can still update User if needed.
    const payerId = order.payer?.payer_id || '';
    const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id || '';
    return { payerId, captureId, tier: tierFromOrder, alreadyCaptured: true };
  }
  if (status !== 'APPROVED') {
    throw new Error('Order cannot be captured. Status: ' + status);
  }

  try {
    const captureRes = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    const captured = captureRes.data;
    const payerId = captured.payer?.payer_id || '';
    const captureId = captured.purchase_units?.[0]?.payments?.captures?.[0]?.id || '';
    return { payerId, captureId, tier: tierFromOrder, alreadyCaptured: false };
  } catch (err) {
    throw new Error('PayPal capture failed: ' + describeAxiosError(err));
  }
}

module.exports = {
  getAccessToken,
  createPaypalOrder,
  capturePaypalOrder,
  parseTier,
  getValidTiers,
  getValidPlanTypes,
  buildTier,
  PLAN_TYPE_YEARLY,
  PLAN_TYPE_PAY_IN_4,
  currencyToPlanRegion,
  tierKeyToPlanKidsLimit,
};
