/**
 * PagBank webhook middleware — raw body + x-authenticity-token (SHA256).
 * Must run after express.raw({ type: 'application/json' }).
 */

const { isPagseguroConfigured } = require('../config/pagseguro');

function getRawBodyString(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  return JSON.stringify(req.body);
}

const pagseguroWebhook = (req, res, next) => {
  if (!isPagseguroConfigured()) {
    console.error('[PagSeguro Webhook] PagBank is not configured');
    return res.status(503).json({
      success: false,
      message: 'PagBank webhooks are not configured.',
    });
  }

  const authenticityToken =
    req.headers['x-authenticity-token'] ||
    req.headers['X-Authenticity-Token'];

  if (!authenticityToken) {
    console.error('[PagSeguro Webhook] Missing x-authenticity-token header');
    return res.status(401).json({
      success: false,
      message: 'Missing authenticity token.',
    });
  }

  req.pagseguroRawBody = getRawBodyString(req);
  req.pagseguroAuthenticityToken = authenticityToken;
  next();
};

module.exports = pagseguroWebhook;
