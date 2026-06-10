/**
 * PagBank webhook middleware — raw body + x-authenticity-token (SHA256).
 * Must run after pagseguroRawBody middleware.
 */

const { isPagseguroConfigured } = require('../config/pagseguro');

function readHeader(req, name) {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== target) continue;
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
  }
  return '';
}

const pagseguroWebhook = (req, res, next) => {
  if (!isPagseguroConfigured()) {
    console.error('[PagSeguro Webhook] PagBank is not configured');
    return res.status(503).json({
      success: false,
      message: 'PagBank webhooks are not configured.',
    });
  }

  if (typeof req.pagseguroRawBody !== 'string' || !req.pagseguroRawBody.length) {
    console.error('[PagSeguro Webhook] Missing raw body string');
    return res.status(400).json({
      success: false,
      message: 'Invalid webhook body.',
    });
  }

  req.pagseguroAuthenticityToken = readHeader(req, 'x-authenticity-token').trim();
  req.pagseguroProductOrigin = readHeader(req, 'x-product-origin').trim();
  req.pagseguroProductId = readHeader(req, 'x-product-id').trim();

  next();
};

module.exports = pagseguroWebhook;
