const axios = require('axios');
const { getAccessToken } = require('../services/paypalService');
const logger = require('../config/logger');

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

const REQUIRED_HEADERS = [
  'paypal-auth-algo',
  'paypal-cert-url',
  'paypal-transmission-id',
  'paypal-transmission-sig',
  'paypal-transmission-time',
];

/**
 * PayPal Webhook Middleware (Chunk 8 — webhook hardening).
 *
 * Unlike Stripe/PagBank, PayPal verification is not a local HMAC check — it requires calling
 * PayPal's own `/v1/notifications/verify-webhook-signature` API with the transmission headers
 * plus the parsed event body and the webhook's configured id (from the PayPal dashboard). Must run
 * BEFORE the route handler and fail closed: any missing header, misconfiguration, or a
 * non-SUCCESS verification result rejects the request with no processing.
 */
async function paypalWebhook(req, res, next) {
  const missing = REQUIRED_HEADERS.filter((h) => !req.headers[h]);
  if (missing.length) {
    logger.error({ missing }, '[PayPal Webhook] Missing verification headers');
    return res.status(400).json({ success: false, message: 'Missing PayPal verification headers' });
  }

  if (!PAYPAL_WEBHOOK_ID) {
    logger.error('[PayPal Webhook] PAYPAL_WEBHOOK_ID is not configured');
    return res.status(500).json({ success: false, message: 'PayPal webhook is not configured' });
  }

  const webhookEvent = req.body;
  if (!webhookEvent || typeof webhookEvent !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid webhook body' });
  }

  try {
    const accessToken = await getAccessToken();
    const verifyRes = await axios.post(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo: req.headers['paypal-auth-algo'],
        cert_url: req.headers['paypal-cert-url'],
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_sig: req.headers['paypal-transmission-sig'],
        transmission_time: req.headers['paypal-transmission-time'],
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: webhookEvent,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    if (verifyRes.data?.verification_status !== 'SUCCESS') {
      logger.error(
        { status: verifyRes.data?.verification_status, eventId: webhookEvent.id },
        '[PayPal Webhook] Signature verification failed'
      );
      return res.status(400).json({ success: false, message: 'Webhook signature verification failed' });
    }
  } catch (err) {
    logger.error({ err }, '[PayPal Webhook] Verification request failed');
    return res.status(400).json({ success: false, message: 'Webhook signature verification failed' });
  }

  req.paypalWebhookEvent = webhookEvent;
  next();
}

module.exports = paypalWebhook;
