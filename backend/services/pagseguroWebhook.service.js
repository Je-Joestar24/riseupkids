/**
 * PagBank webhook verification and checkout sync (Phase 2).
 */

const crypto = require('crypto');
const PagSeguroCheckout = require('../models/PagSeguroCheckout');
const { getWebhookSigningTokens } = require('../config/pagseguro');
const {
  getPagbankCheckout,
  getPagbankCharge,
  resolveCheckoutPaymentStatus,
  extractCheckoutIdFromCharge,
} = require('./pagseguro.service');
const { activateUserFromPagseguroCheckout } = require('./pagseguroActivation.service');

const SUCCESSFUL_CHARGE_STATUSES = new Set(['PAID', 'AUTHORIZED']);

/**
 * SHA256 hex of `{token}-{rawBody}` per PagBank docs.
 * @see https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao
 */
function computeWebhookSignature(rawBody, signingToken) {
  return crypto
    .createHash('sha256')
    .update(`${signingToken}-${rawBody}`, 'utf8')
    .digest('hex');
}

function verifyWebhookSignature(rawBody, authenticityToken) {
  if (!authenticityToken || typeof rawBody !== 'string' || !rawBody.length) {
    return false;
  }

  const received = String(authenticityToken).trim().toLowerCase();
  const signingTokens = getWebhookSigningTokens();
  if (!signingTokens.length) return false;

  return signingTokens.some((token) => {
    const expected = computeWebhookSignature(rawBody, token);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(received, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  });
}

function webhookFingerprint(rawBody) {
  return crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

/**
 * Payment webhooks for Checkout often send an ORDER (ORDE_) payload with nested charges.
 * @param {object} payload
 * @returns {{ status: string, chargeIds: string[], paidChargeId?: string }}
 */
function analyzeWebhookPayloadPayment(payload) {
  if (!payload || typeof payload !== 'object') {
    return { status: 'pending', chargeIds: [] };
  }

  if (payload.id?.startsWith('CHAR_')) {
    const st = String(payload.status || '').toUpperCase();
    if (SUCCESSFUL_CHARGE_STATUSES.has(st)) {
      return { status: 'paid', chargeIds: [payload.id], paidChargeId: payload.id };
    }
    return { status: st.toLowerCase() || 'pending', chargeIds: [payload.id] };
  }

  const charges = Array.isArray(payload.charges) ? payload.charges : [];
  const chargeIds = charges.map((c) => c.id).filter(Boolean);
  const paidCharge = charges.find((c) =>
    SUCCESSFUL_CHARGE_STATUSES.has(String(c.status || '').toUpperCase())
  );

  if (paidCharge?.id) {
    return { status: 'paid', chargeIds, paidChargeId: paidCharge.id };
  }

  return { status: 'pending', chargeIds };
}

function extractPrimaryChargeId(payload) {
  const analysis = analyzeWebhookPayloadPayment(payload);
  return analysis.paidChargeId || analysis.chargeIds[0] || null;
}

/**
 * When SHA256 header verification fails (CloudFront/body drift), confirm with PagBank API.
 * Safe for production: we only trust GET /charges/{id} using our server token.
 */
async function confirmWebhookViaPagbankApi(payload) {
  const record = await findCheckoutRecord(payload);
  if (!record) return false;

  const payment = analyzeWebhookPayloadPayment(payload);
  if (payment.status !== 'paid' || !payment.paidChargeId) {
    return false;
  }

  if (payload.reference_id && payload.reference_id !== record.referenceId) {
    return false;
  }

  try {
    const charge = await getPagbankCharge(payment.paidChargeId);
    const chargeStatus = String(charge.status || '').toUpperCase();
    if (!SUCCESSFUL_CHARGE_STATUSES.has(chargeStatus)) {
      return false;
    }

    if (charge.reference_id && charge.reference_id !== record.referenceId) {
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[PagSeguro Webhook] API confirmation failed:', err.message);
    return false;
  }
}

/**
 * Resolve local checkout record from webhook payload.
 * Supports CHEC_, CHAR_, ORDE_ (payment_notification_urls), and reference_id.
 */
async function findCheckoutRecord(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (payload.reference_id) {
    const byRef = await PagSeguroCheckout.findOne({ referenceId: payload.reference_id });
    if (byRef) return byRef;
  }

  if (payload.id?.startsWith('CHEC_')) {
    return PagSeguroCheckout.findOne({ pagbankCheckoutId: payload.id });
  }

  if (payload.id?.startsWith('ORDE_') && Array.isArray(payload.charges)) {
    for (const charge of payload.charges) {
      const checkoutId = extractCheckoutIdFromCharge(charge);
      if (checkoutId) {
        const byCheckout = await PagSeguroCheckout.findOne({ pagbankCheckoutId: checkoutId });
        if (byCheckout) return byCheckout;
      }
    }
  }

  if (payload.id?.startsWith('CHAR_')) {
    try {
      const charge = await getPagbankCharge(payload.id);
      const checkoutId = extractCheckoutIdFromCharge(charge);
      if (checkoutId) {
        return PagSeguroCheckout.findOne({ pagbankCheckoutId: checkoutId });
      }
      if (charge.reference_id) {
        return PagSeguroCheckout.findOne({ referenceId: charge.reference_id });
      }
    } catch (err) {
      console.error('[PagSeguro Webhook] Failed to resolve charge to checkout:', err.message);
    }
  }

  return null;
}

/**
 * Sync local record from PagBank and activate if PAID.
 */
async function syncCheckoutAndActivate(record, meta = {}, options = {}) {
  if (!record.pagbankCheckoutId) {
    throw new Error('Checkout record missing pagbankCheckoutId.');
  }

  let analysis = options.webhookPayment || null;

  if (!analysis || analysis.status !== 'paid') {
    const apiCheckout = await getPagbankCheckout(record.pagbankCheckoutId);
    analysis = await resolveCheckoutPaymentStatus(apiCheckout, {
      storedChargeIds: [
        ...(record.chargeIds || []),
        ...(options.extraChargeIds || []),
        extractPrimaryChargeId(options.webhookPayload),
      ].filter(Boolean),
    });
  }

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
    return { status: 'paid', activated: true };
  }

  await record.save();
  return { status: analysis.status, activated: false };
}

/**
 * Process PagBank webhook notification.
 */
async function processWebhookNotification({ rawBody, authenticityToken, webhookKind }) {
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    const err = new Error('Invalid webhook JSON body.');
    err.statusCode = 400;
    throw err;
  }

  const signatureOk = authenticityToken
    ? verifyWebhookSignature(rawBody, authenticityToken)
    : false;

  if (!signatureOk) {
    const apiConfirmed = await confirmWebhookViaPagbankApi(payload);
    if (!apiConfirmed) {
      const reason = authenticityToken ? 'Invalid webhook signature.' : 'Missing authenticity token.';
      console.error(
        '[PagSeguro Webhook] Auth failed – kind=%s, hasHeader=%s, payloadId=%s, reference=%s, bodyLen=%s',
        webhookKind,
        Boolean(authenticityToken),
        payload.id,
        payload.reference_id,
        rawBody.length
      );
      const err = new Error(reason);
      err.statusCode = 401;
      throw err;
    }
    console.warn(
      '[PagSeguro Webhook] Accepted via PagBank API confirmation (signature/header issue) – kind=%s, id=%s',
      webhookKind,
      payload.id
    );
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

  const webhookPayment = analyzeWebhookPayloadPayment(payload);

  const result = await syncCheckoutAndActivate(
    record,
    { webhookKind, fingerprint },
    {
      webhookPayment: webhookPayment.status === 'paid' ? webhookPayment : null,
      webhookPayload: payload,
      extraChargeIds: webhookPayment.chargeIds,
    }
  );

  return {
    processed: true,
    checkoutId: record.pagbankCheckoutId,
    authMethod: signatureOk ? 'signature' : 'api_confirmation',
    ...result,
  };
}

module.exports = {
  computeWebhookSignature,
  verifyWebhookSignature,
  webhookFingerprint,
  analyzeWebhookPayloadPayment,
  confirmWebhookViaPagbankApi,
  processWebhookNotification,
  syncCheckoutAndActivate,
  findCheckoutRecord,
};
