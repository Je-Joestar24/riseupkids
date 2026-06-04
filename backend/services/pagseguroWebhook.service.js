/**
 * PagBank webhook verification and checkout sync (Phase 2).
 */

const crypto = require('crypto');
const PagSeguroCheckout = require('../models/PagSeguroCheckout');
const { PAGSEGURO_ACCESS_TOKEN } = require('../config/pagseguro');
const {
  getPagbankCheckout,
  getPagbankCharge,
  analyzeCheckoutPayment,
  resolveCheckoutPaymentStatus,
  extractCheckoutIdFromCharge,
} = require('./pagseguro.service');
const { activateUserFromPagseguroCheckout } = require('./pagseguroActivation.service');

/**
 * SHA256 hex of `{token}-{rawBody}` per PagBank docs.
 * @param {string} rawBody - exact JSON string received (no re-formatting)
 * @param {string} authenticityToken - x-authenticity-token header
 */
function verifyWebhookSignature(rawBody, authenticityToken) {
  if (!PAGSEGURO_ACCESS_TOKEN || !authenticityToken || typeof rawBody !== 'string') {
    return false;
  }
  const expected = crypto
    .createHash('sha256')
    .update(`${PAGSEGURO_ACCESS_TOKEN}-${rawBody}`, 'utf8')
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(authenticityToken).trim().toLowerCase(), 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function webhookFingerprint(rawBody) {
  return crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

/**
 * Resolve local checkout record from webhook payload.
 * @param {object} payload
 */
async function findCheckoutRecord(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (payload.id?.startsWith('CHEC_')) {
    return PagSeguroCheckout.findOne({ pagbankCheckoutId: payload.id });
  }

  if (payload.reference_id) {
    const byRef = await PagSeguroCheckout.findOne({ referenceId: payload.reference_id });
    if (byRef) return byRef;
  }

  if (payload.id?.startsWith('CHAR_')) {
    try {
      const charge = await getPagbankCharge(payload.id);
      const checkoutId = extractCheckoutIdFromCharge(charge);
      if (checkoutId) {
        return PagSeguroCheckout.findOne({ pagbankCheckoutId: checkoutId });
      }
    } catch (err) {
      console.error('[PagSeguro Webhook] Failed to resolve charge to checkout:', err.message);
    }
  }

  return null;
}

/**
 * Sync local record from PagBank GET checkout and activate if PAID.
 * @param {import('../models/PagSeguroCheckout')} record
 * @param {{ webhookKind?: string, fingerprint?: string, setTermsIp?: string|null }} [meta]
 */
async function syncCheckoutAndActivate(record, meta = {}) {
  if (!record.pagbankCheckoutId) {
    throw new Error('Checkout record missing pagbankCheckoutId.');
  }

  const apiCheckout = await getPagbankCheckout(record.pagbankCheckoutId);
  const analysis = await resolveCheckoutPaymentStatus(apiCheckout, {
    storedChargeIds: record.chargeIds || [],
  });

  if (meta.fingerprint) {
    const exists = record.webhookEvents.some((e) => e.fingerprint === meta.fingerprint);
    if (!exists) {
      record.webhookEvents.push({
        fingerprint: meta.fingerprint,
        type: meta.webhookKind || 'sync',
        receivedAt: new Date(),
      });
    }
  }

  record.status = analysis.status;
  if (analysis.chargeIds.length > 0) {
    record.chargeIds = [...new Set([...(record.chargeIds || []), ...analysis.chargeIds])];
  }

  if (analysis.status === 'paid') {
    record.paidAt = record.paidAt || new Date();
    await record.save();
    await activateUserFromPagseguroCheckout(record, {
      chargeId: analysis.paidChargeId,
      setTermsIp: meta.setTermsIp,
    });
    return { status: 'paid', activated: true, checkoutStatus: apiCheckout.status };
  }

  await record.save();
  return { status: analysis.status, activated: false, checkoutStatus: apiCheckout.status };
}

/**
 * Process PagBank webhook notification.
 * @param {{ rawBody: string, authenticityToken: string, webhookKind: 'checkout'|'payment' }} input
 */
async function processWebhookNotification({ rawBody, authenticityToken, webhookKind }) {
  if (!verifyWebhookSignature(rawBody, authenticityToken)) {
    const err = new Error('Invalid webhook signature.');
    err.statusCode = 401;
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    const err = new Error('Invalid webhook JSON body.');
    err.statusCode = 400;
    throw err;
  }

  const fingerprint = webhookFingerprint(rawBody);
  const record = await findCheckoutRecord(payload);

  if (!record) {
    console.warn(
      '[PagSeguro Webhook] Unknown checkout – kind=%s, payloadId=%s, reference=%s',
      webhookKind,
      payload.id,
      payload.reference_id
    );
    return { processed: false, reason: 'checkout_not_found' };
  }

  if (record.webhookEvents.some((e) => e.fingerprint === fingerprint)) {
    return { processed: true, duplicate: true, checkoutId: record.pagbankCheckoutId };
  }

  if (record.status === 'paid') {
    record.webhookEvents.push({
      fingerprint,
      type: webhookKind,
      receivedAt: new Date(),
    });
    await record.save();
    return { processed: true, duplicate: true, status: 'paid', checkoutId: record.pagbankCheckoutId };
  }

  const result = await syncCheckoutAndActivate(record, {
    webhookKind,
    fingerprint,
  });

  return {
    processed: true,
    checkoutId: record.pagbankCheckoutId,
    ...result,
  };
}

module.exports = {
  verifyWebhookSignature,
  webhookFingerprint,
  processWebhookNotification,
  syncCheckoutAndActivate,
  findCheckoutRecord,
};
