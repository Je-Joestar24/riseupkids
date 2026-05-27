/**
 * PagBank (PagSeguro) Checkout API — Family Plan (Brazil).
 * Hosted checkout: POST /checkouts, GET /checkouts/{id}.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const {
  PAGSEGURO_API_BASE,
  PAGSEGURO_ACCESS_TOKEN,
  INSTALLMENTS_LIMIT,
  INTEREST_FREE_INSTALLMENTS,
  SOFT_DESCRIPTOR,
  isPagseguroConfigured,
  getWebhookBaseUrl,
  getSaleAppBaseUrl,
} = require('../config/pagseguro');

const PRICES_PATH = path.join(__dirname, '..', 'config', 'pagseguroFamilyPlanPrices.json');

const MIN_CHILDREN = 1;
const MAX_CHILDREN = 10;

let _prices = null;

function getPrices() {
  if (_prices) return _prices;
  if (!fs.existsSync(PRICES_PATH)) {
    throw new Error('PagSeguro pricing config not found: ' + PRICES_PATH);
  }
  _prices = JSON.parse(fs.readFileSync(PRICES_PATH, 'utf8'));
  return _prices;
}

function clampChildCount(childCount) {
  return Math.min(MAX_CHILDREN, Math.max(MIN_CHILDREN, Number(childCount) || 1));
}

function getPlanAmountCents(childCount) {
  const count = clampChildCount(childCount);
  const prices = getPrices();
  const cents = prices.planAmountCents[String(count)] ?? prices.planAmountCents[count];
  if (typeof cents !== 'number' || cents < 1) {
    throw new Error(`No BRL plan price for childCount=${count}.`);
  }
  return cents;
}

function getBoxAmountCents(childCount) {
  const count = clampChildCount(childCount);
  const perChild = getPrices().boxAmountCentsPerChild ?? 29700;
  return perChild * count;
}

/**
 * Build PagBank line items (amounts in centavos).
 * @returns {{ items: object[], totalCents: number }}
 */
function buildCheckoutLineItems(childCount, addBox = false) {
  const count = clampChildCount(childCount);
  const planCents = getPlanAmountCents(count);
  const childWord = count === 1 ? 'child' : 'children';

  const items = [
    {
      reference_id: `family-plan-${count}`,
      name: `Rise Up Kids Family Plan (${count} ${childWord})`,
      quantity: 1,
      unit_amount: planCents,
    },
  ];

  let totalCents = planCents;

  if (addBox) {
    const boxCents = getBoxAmountCents(count);
    items.push({
      reference_id: `activity-box-${count}`,
      name: `Family Plan – Activity Box (${count} box${count > 1 ? 'es' : ''})`,
      quantity: 1,
      unit_amount: boxCents,
    });
    totalCents += boxCents;
  }

  return { items, totalCents };
}

/** Strip non-digits from CPF/CNPJ. */
function normalizeTaxId(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Basic CPF validation (11 digits + check digits).
 * @param {string} cpf - digits only
 */
function isValidCpf(cpf) {
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

/**
 * Normalize BR mobile phone for PagBank (area 2 digits, number 9 digits starting with 9).
 */
function normalizeBrazilPhone(phone) {
  const area = String(phone?.area || '').replace(/\D/g, '').slice(0, 2);
  let number = String(phone?.number || '').replace(/\D/g, '');
  if (number.length === 11 && number.startsWith('9', 1)) {
    number = number.slice(2);
  }
  if (number.length === 10) {
    number = number.slice(1);
  }
  number = number.slice(0, 9);
  if (area.length !== 2 || number.length !== 9 || number[0] !== '9') {
    return null;
  }
  return { country: '+55', area, number };
}

function splitCustomerName(fullName) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) return 'Cliente Rise Up Kids';
  return trimmed;
}

function describeAxiosError(err) {
  if (!err || typeof err !== 'object') return String(err);
  const status = err.response?.status;
  const data = err.response?.data;
  const parts = [];
  if (status) parts.push('HTTP ' + status);
  if (err.message) parts.push(err.message);
  if (data?.error_messages?.length) {
    parts.push(
      data.error_messages
        .map((e) => `${e.code || 'error'}:${e.parameter_name || ''}:${e.description || ''}`)
        .join('; ')
    );
  } else if (data) {
    parts.push(JSON.stringify(data));
  }
  return parts.join(' | ');
}

function mapPagbankErrorToClientMessage(err) {
  const messages = err.response?.data?.error_messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Unable to create PagBank checkout. Please try again.';
  }
  const first = messages[0];
  if (first.code === 'allowlist_access_required') {
    return 'PagBank checkout is not enabled for this account yet. Please contact support.';
  }
  if (first.parameter_name === 'customer.tax_id' || first.code === 'invalid_format') {
    return 'Invalid CPF. Please check your tax ID and try again.';
  }
  return first.description || 'Invalid checkout data. Please review your information.';
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${PAGSEGURO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    accept: 'application/json',
  };
}

function extractPayUrl(links) {
  if (!Array.isArray(links)) return null;
  const pay = links.find((l) => String(l.rel).toUpperCase() === 'PAY');
  return pay?.href || null;
}

/**
 * Public config for sale app (no secrets).
 */
function getPagseguroConfig() {
  return {
    enabled: isPagseguroConfigured(),
    region: 'br',
    currency: getPrices().currency || 'BRL',
    minChildren: MIN_CHILDREN,
    maxChildren: MAX_CHILDREN,
    installmentsLimit: INSTALLMENTS_LIMIT,
    interestFreeInstallments: INTEREST_FREE_INSTALLMENTS,
    paymentMethods: ['CREDIT_CARD', 'PIX'],
  };
}

/**
 * Build API payload for POST /checkouts.
 */
function buildCheckoutPayload({
  referenceId,
  user,
  taxId,
  phone,
  childCount,
  addBox,
  successUrl,
  cancelUrl,
  termsVersion,
}) {
  const cpf = normalizeTaxId(taxId);
  if (!isValidCpf(cpf)) {
    throw new Error('Invalid CPF. Provide an 11-digit valid tax ID.');
  }

  const normalizedPhone = normalizeBrazilPhone(phone);
  if (!normalizedPhone) {
    throw new Error(
      'Invalid phone. Use Brazilian mobile: area (DDD) and 9-digit number starting with 9.'
    );
  }

  const { items } = buildCheckoutLineItems(childCount, addBox);
  const webhookBase = getWebhookBaseUrl();
  const saleBase = getSaleAppBaseUrl();

  // PagBank validates URL fields strictly; avoid unsupported placeholders.
  // We use provider flag + sessionStorage checkout id for success verification.
  const finalSuccessUrl =
    successUrl ||
    `${saleBase}/checkout/success?provider=pagseguro`;
  const finalCancelUrl = cancelUrl || `${saleBase}/checkout/register`;
  const finalReturnUrl = cancelUrl || `${saleBase}/checkout/register`;

  return {
    reference_id: referenceId,
    customer_modifiable: false,
    customer: {
      name: splitCustomerName(user.name),
      email: user.email,
      tax_id: cpf,
      phone: normalizedPhone,
    },
    items,
    payment_methods: [{ type: 'CREDIT_CARD' }, { type: 'PIX' }],
    payment_methods_configs: [
      {
        type: 'CREDIT_CARD',
        config_options: [
          { option: 'INSTALLMENTS_LIMIT', value: String(INSTALLMENTS_LIMIT) },
          {
            option: 'INTEREST_FREE_INSTALLMENTS',
            value: String(INTEREST_FREE_INSTALLMENTS),
          },
        ],
      },
    ],
    soft_descriptor: SOFT_DESCRIPTOR,
    redirect_url: finalSuccessUrl,
    return_url: finalReturnUrl,
    notification_urls: [`${webhookBase}/api/pagseguro/webhooks/checkout`],
    payment_notification_urls: [`${webhookBase}/api/pagseguro/webhooks/payment`],
  };
}

/**
 * Create PagBank checkout session.
 * @returns {Promise<{ referenceId, checkoutId, payUrl, amountCents, expiresAt? }>}
 */
function generateReferenceId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
}

async function createPagbankCheckout({
  referenceId,
  user,
  childCount,
  addBox = false,
  taxId,
  phone,
  successUrl,
  cancelUrl,
  termsVersion,
}) {
  if (!isPagseguroConfigured()) {
    throw new Error('PagBank is not configured. Set PAGSEGURO_ACCESS_TOKEN.');
  }

  const count = clampChildCount(childCount);
  const { totalCents } = buildCheckoutLineItems(count, addBox);
  const finalReferenceId = referenceId || generateReferenceId();

  const payload = buildCheckoutPayload({
    referenceId: finalReferenceId,
    user,
    taxId,
    phone,
    childCount: count,
    addBox,
    successUrl,
    cancelUrl,
    termsVersion,
  });

  try {
    const res = await axios.post(`${PAGSEGURO_API_BASE}/checkouts`, payload, {
      headers: getAuthHeaders(),
      timeout: 20000,
    });

    const data = res.data || {};
    const checkoutId = data.id;
    const payUrl = extractPayUrl(data.links);

    if (!checkoutId || !payUrl) {
      throw new Error('PagBank response missing checkout id or PAY link.');
    }

    return {
      referenceId: finalReferenceId,
      checkoutId,
      payUrl,
      amountCents: totalCents,
      expirationDate: data.expiration_date || null,
      status: data.status || 'ACTIVE',
    };
  } catch (err) {
    const clientMsg = mapPagbankErrorToClientMessage(err);
    const detail = describeAxiosError(err);
    const error = new Error(clientMsg);
    error.statusCode = err.response?.status === 400 ? 400 : 502;
    error.internalDetail = detail;
    throw error;
  }
}

/**
 * Map PagBank charge/checkout statuses to our PagSeguroCheckout status.
 * @param {object} apiCheckout - GET /checkouts/{id} response
 * @returns {{ status: string, chargeIds: string[], paidChargeId?: string }}
 */
function analyzeCheckoutPayment(apiCheckout) {
  const checkoutStatus = String(apiCheckout?.status || '').toUpperCase();
  if (checkoutStatus === 'EXPIRED') {
    return { status: 'expired', chargeIds: [] };
  }

  const charges = Array.isArray(apiCheckout?.charges) ? apiCheckout.charges : [];
  const chargeIds = charges.map((c) => c.id).filter(Boolean);
  const statuses = charges.map((c) => String(c.status || '').toUpperCase());

  if (statuses.includes('PAID')) {
    const paid = charges.find((c) => String(c.status).toUpperCase() === 'PAID');
    return { status: 'paid', chargeIds, paidChargeId: paid?.id };
  }
  if (statuses.includes('IN_ANALYSIS')) {
    return { status: 'in_analysis', chargeIds };
  }
  if (statuses.includes('WAITING')) {
    return { status: 'waiting', chargeIds };
  }
  if (statuses.includes('DECLINED')) {
    return { status: 'declined', chargeIds };
  }
  if (statuses.includes('CANCELED')) {
    return { status: 'canceled', chargeIds };
  }

  if (checkoutStatus === 'INACTIVE') {
    return { status: 'pending', chargeIds };
  }

  return { status: 'pending', chargeIds };
}

/**
 * Extract checkout id from charge links or related fields.
 * @param {object} charge
 */
function extractCheckoutIdFromCharge(charge) {
  for (const link of charge?.links || []) {
    const href = link.href || '';
    const match = href.match(/checkouts\/(CHEC_[^/?]+)/i);
    if (match) return match[1];
  }
  return null;
}

/**
 * Retrieve a charge from PagBank (payment webhooks may send CHAR_ id only).
 */
async function getPagbankCharge(chargeId) {
  if (!isPagseguroConfigured()) {
    throw new Error('PagBank is not configured.');
  }
  try {
    const res = await axios.get(
      `${PAGSEGURO_API_BASE}/charges/${encodeURIComponent(chargeId)}`,
      { headers: getAuthHeaders(), timeout: 20000 }
    );
    return res.data;
  } catch (err) {
    throw new Error('PagBank getCharge failed: ' + describeAxiosError(err));
  }
}

/**
 * Retrieve checkout from PagBank (verification).
 */
async function getPagbankCheckout(checkoutId) {
  if (!isPagseguroConfigured()) {
    throw new Error('PagBank is not configured. Set PAGSEGURO_ACCESS_TOKEN.');
  }
  if (!checkoutId || typeof checkoutId !== 'string') {
    throw new Error('checkoutId is required.');
  }

  try {
    const res = await axios.get(`${PAGSEGURO_API_BASE}/checkouts/${encodeURIComponent(checkoutId)}`, {
      headers: getAuthHeaders(),
      timeout: 20000,
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const notFound = new Error('Checkout not found.');
      notFound.statusCode = 404;
      throw notFound;
    }
    throw new Error('PagBank getCheckout failed: ' + describeAxiosError(err));
  }
}

module.exports = {
  MIN_CHILDREN,
  MAX_CHILDREN,
  getPrices,
  getPlanAmountCents,
  getBoxAmountCents,
  buildCheckoutLineItems,
  normalizeTaxId,
  isValidCpf,
  normalizeBrazilPhone,
  getPagseguroConfig,
  buildCheckoutPayload,
  generateReferenceId,
  createPagbankCheckout,
  getPagbankCheckout,
  getPagbankCharge,
  analyzeCheckoutPayment,
  extractCheckoutIdFromCharge,
  extractPayUrl,
  describeAxiosError,
  isPagseguroConfigured,
};
