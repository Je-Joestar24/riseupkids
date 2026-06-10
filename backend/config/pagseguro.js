/**
 * PagBank (PagSeguro) Checkout API configuration.
 * Bearer token is server-only — never expose to the frontend.
 */

const PAGSEGURO_ENV = (process.env.PAGSEGURO_ENV || 'sandbox').toLowerCase();

const DEFAULT_API_BASE =
  PAGSEGURO_ENV === 'production'
    ? 'https://api.pagseguro.com'
    : 'https://sandbox.api.pagseguro.com';

const PAGSEGURO_API_BASE = (process.env.PAGSEGURO_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
const PAGSEGURO_ACCESS_TOKEN = (process.env.PAGSEGURO_ACCESS_TOKEN || '').trim();
/** Optional separate signing token (some accounts use iBanking token distinct from Connect Bearer). */
const PAGSEGURO_WEBHOOK_TOKEN = (process.env.PAGSEGURO_WEBHOOK_TOKEN || '').trim();

const INSTALLMENTS_LIMIT = Math.min(
  12,
  Math.max(1, parseInt(process.env.PAGSEGURO_INSTALLMENTS_LIMIT || '12', 10) || 12)
);

const INTEREST_FREE_INSTALLMENTS = Math.min(
  INSTALLMENTS_LIMIT,
  Math.max(
    0,
    parseInt(process.env.PAGSEGURO_INTEREST_FREE_INSTALLMENTS || '12', 10) || 12
  )
);

const SOFT_DESCRIPTOR = (process.env.PAGSEGURO_SOFT_DESCRIPTOR || 'RISEUPKIDS').slice(0, 17);

function isPagseguroConfigured() {
  return Boolean(PAGSEGURO_ACCESS_TOKEN && PAGSEGURO_API_BASE);
}

function isPagseguroSandbox() {
  return PAGSEGURO_ENV !== 'production';
}

/** Tokens tried for SHA256 webhook verification (Bearer + optional webhook token). */
function getWebhookSigningTokens() {
  return [...new Set([PAGSEGURO_ACCESS_TOKEN, PAGSEGURO_WEBHOOK_TOKEN].filter(Boolean))];
}

function getWebhookBaseUrl() {
  return (
    process.env.API_PUBLIC_BASE_URL ||
    process.env.BACKEND_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/$/, '');
}

function getSaleAppBaseUrl() {
  return (
    process.env.SALE_APP_BASE_URL ||
    process.env.FRONTEND_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

module.exports = {
  PAGSEGURO_ENV,
  PAGSEGURO_API_BASE,
  PAGSEGURO_ACCESS_TOKEN,
  PAGSEGURO_WEBHOOK_TOKEN,
  INSTALLMENTS_LIMIT,
  INTEREST_FREE_INSTALLMENTS,
  SOFT_DESCRIPTOR,
  isPagseguroConfigured,
  isPagseguroSandbox,
  getWebhookSigningTokens,
  getWebhookBaseUrl,
  getSaleAppBaseUrl,
};
