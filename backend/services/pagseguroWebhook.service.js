/**
 * PagBank webhook verification and checkout sync (Phase 2).
 */

const crypto = require('crypto');
const PagSeguroCheckout = require('../models/PagSeguroCheckout');
const { PAGSEGURO_ENV, getWebhookSigningTokens } = require('../config/pagseguro');
const {
  getPagbankCheckout,
  getPagbankCharge,
  getPagbankOrder,
  resolveCheckoutPaymentStatus,
  extractCheckoutIdFromCharge,
} = require('./pagseguro.service');
const { activateUserFromPagseguroCheckout } = require('./pagseguroActivation.service');
const {
  buildLocalRecordSnapshot,
  summarizeCharges,
  attachDiagnostics,
} = require('./pagseguroDiagnostics.service');

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
  return diagnoseWebhookSignature(rawBody, authenticityToken).signatureMatched;
}

/**
 * @param {string} rawBody
 * @param {string} authenticityToken
 */
function diagnoseWebhookSignature(rawBody, authenticityToken) {
  const received = String(authenticityToken || '').trim().toLowerCase();
  const tokens = getWebhookSigningTokens();
  const tokenAttempts = tokens.map((token, index) => {
    const expected = computeWebhookSignature(rawBody, token);
    let matches = false;
    if (received) {
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(received, 'utf8');
      matches = a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    return {
      tokenSource: index === 0 ? 'PAGSEGURO_ACCESS_TOKEN' : 'PAGSEGURO_WEBHOOK_TOKEN',
      matches,
    };
  });

  return {
    env: PAGSEGURO_ENV,
    hasAuthenticityHeader: Boolean(authenticityToken),
    headerHexLength: received.length,
    bodyLength: typeof rawBody === 'string' ? rawBody.length : 0,
    bodyFingerprint:
      typeof rawBody === 'string'
        ? crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex').slice(0, 16)
        : null,
    signingTokensConfigured: tokens.length,
    signatureMatched: tokenAttempts.some((a) => a.matches),
    tokenAttempts,
    hint: tokenAttempts.some((a) => a.matches)
      ? null
      : 'PagBank signs webhooks with the iBanking token (set PAGSEGURO_WEBHOOK_TOKEN). It is often different from PAGSEGURO_ACCESS_TOKEN. CloudFront must forward the raw POST body unchanged.',
  };
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
 * When SHA256 header verification fails, confirm the notification belongs to our checkout
 * by re-fetching the PagBank resource with our server token (never trust body alone).
 */
async function verifyWebhookPayloadOwnership(payload, record) {
  const result = {
    verified: false,
    payloadId: payload?.id || null,
    payloadType: null,
    reason: null,
    apiSnapshot: null,
  };

  if (!payload?.id || !record) {
    result.reason = 'missing_payload_or_record';
    return result;
  }

  if (payload.reference_id && payload.reference_id !== record.referenceId) {
    result.reason = 'reference_id_mismatch';
    return result;
  }

  if (payload.id.startsWith('CHEC_')) {
    result.payloadType = 'checkout';
    if (payload.id !== record.pagbankCheckoutId) {
      result.reason = 'checkout_id_mismatch';
      return result;
    }
    try {
      const checkout = await getPagbankCheckout(payload.id);
      result.apiSnapshot = {
        id: checkout.id,
        status: checkout.status,
        reference_id: checkout.reference_id,
        charges: summarizeCharges(checkout),
      };
      if (checkout.reference_id && checkout.reference_id !== record.referenceId) {
        result.reason = 'checkout_reference_mismatch';
        return result;
      }
      result.verified = true;
      return result;
    } catch (err) {
      result.reason = 'api_get_checkout_failed';
      result.error = err.message;
      return result;
    }
  }

  if (payload.id.startsWith('CHAR_')) {
    result.payloadType = 'charge';
    try {
      const charge = await getPagbankCharge(payload.id);
      result.apiSnapshot = {
        id: charge.id,
        status: charge.status,
        reference_id: charge.reference_id,
      };
      const checkoutId = extractCheckoutIdFromCharge(charge);
      if (checkoutId && checkoutId !== record.pagbankCheckoutId) {
        result.reason = 'charge_checkout_mismatch';
        return result;
      }
      if (charge.reference_id && charge.reference_id !== record.referenceId) {
        result.reason = 'charge_reference_mismatch';
        return result;
      }
      result.verified = true;
      return result;
    } catch (err) {
      result.reason = 'api_get_charge_failed';
      result.error = err.message;
      return result;
    }
  }

  if (payload.id.startsWith('ORDE_')) {
    result.payloadType = 'order';
    try {
      const order = await getPagbankOrder(payload.id);
      result.apiSnapshot = {
        id: order.id,
        status: order.status,
        reference_id: order.reference_id,
        charges: summarizeCharges(order),
      };
      if (order.reference_id && order.reference_id !== record.referenceId) {
        result.reason = 'order_reference_mismatch';
        return result;
      }
      result.verified = true;
      return result;
    } catch (err) {
      if (payload.reference_id === record.referenceId && Array.isArray(payload.charges)) {
        result.apiSnapshot = {
          fromPayload: true,
          charges: payload.charges.map((c) => ({ id: c.id, status: c.status })),
        };
        result.verified = true;
        result.reason = 'order_api_failed_reference_match';
        return result;
      }
      result.reason = 'api_get_order_failed';
      result.error = err.message;
      return result;
    }
  }

  if (payload.reference_id === record.referenceId) {
    result.verified = true;
    result.reason = 'reference_id_only_match';
    return result;
  }

  result.reason = 'unsupported_payload_id';
  return result;
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

  const trace = options.trace || [];
  let analysis = options.webhookPayment || null;

  if (!analysis || analysis.status !== 'paid') {
    const apiCheckout = await getPagbankCheckout(record.pagbankCheckoutId);
    analysis = await resolveCheckoutPaymentStatus(apiCheckout, {
      storedChargeIds: [
        ...(record.chargeIds || []),
        ...(options.extraChargeIds || []),
        extractPrimaryChargeId(options.webhookPayload),
      ].filter(Boolean),
      referenceId: record.referenceId,
      trace,
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

  if (record.status === 'paid' && analysis.status !== 'paid') {
    analysis.status = 'paid';
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
  return {
    status: analysis.status,
    activated: false,
    ordersLookup: analysis.ordersLookup || null,
    trace,
  };
}

/**
 * Process PagBank webhook notification.
 */
async function processWebhookNotification({ rawBody, authenticityToken, webhookKind }) {
  const diagnostics = {
    webhookKind,
    signature: diagnoseWebhookSignature(rawBody, authenticityToken),
    steps: [],
  };

  let payload;
  try {
    payload = JSON.parse(rawBody);
    diagnostics.steps.push({
      step: 'parse_json',
      ok: true,
      payloadId: payload.id,
      reference_id: payload.reference_id || null,
      payloadStatus: payload.status || null,
    });
  } catch (parseErr) {
    diagnostics.steps.push({ step: 'parse_json', ok: false, error: parseErr.message });
    const err = new Error('Invalid webhook JSON body.');
    err.statusCode = 400;
    throw attachDiagnostics(err, diagnostics);
  }

  const signatureOk = diagnostics.signature.signatureMatched;
  let authMethod = signatureOk ? 'signature' : null;

  const record = await findCheckoutRecord(payload);
  diagnostics.steps.push({
    step: 'find_local_record',
    ok: Boolean(record),
    local: buildLocalRecordSnapshot(record),
  });

  if (!signatureOk) {
    if (!record) {
      const err = new Error(
        authenticityToken ? 'Invalid webhook signature.' : 'Missing authenticity token.'
      );
      err.statusCode = 401;
      diagnostics.rejectionReason = 'signature_failed_no_local_record';
      diagnostics.authMethod = 'rejected';
      throw attachDiagnostics(err, diagnostics);
    }

    const ownership = await verifyWebhookPayloadOwnership(payload, record);
    diagnostics.steps.push({ step: 'api_ownership_verification', ...ownership });

    if (!ownership.verified) {
      const err = new Error('Webhook signature invalid and PagBank API could not verify ownership.');
      err.statusCode = 401;
      diagnostics.rejectionReason = 'signature_and_api_ownership_failed';
      diagnostics.authMethod = 'rejected';
      throw attachDiagnostics(err, diagnostics);
    }

    authMethod = 'api_ownership';
    diagnostics.steps.push({
      step: 'auth_bypass',
      ok: true,
      reason: 'signature_failed_but_pagbank_api_confirmed_ownership',
    });
  }

  const fingerprint = webhookFingerprint(rawBody);

  if (!record) {
    diagnostics.processed = false;
    diagnostics.reason = 'checkout_not_found';
    return diagnostics;
  }

  if (record.webhookEvents.some((e) => e.fingerprint === fingerprint)) {
    return {
      processed: true,
      duplicate: true,
      checkoutId: record.pagbankCheckoutId,
      authMethod,
      diagnostics,
    };
  }

  if (record.status === 'paid') {
    record.webhookEvents.push({
      fingerprint,
      type: webhookKind,
      receivedAt: new Date(),
    });
    await record.save();
    return {
      processed: true,
      duplicate: true,
      status: 'paid',
      checkoutId: record.pagbankCheckoutId,
      authMethod,
      diagnostics,
    };
  }

  const trace = [];
  const webhookPayment = analyzeWebhookPayloadPayment(payload);
  diagnostics.steps.push({
    step: 'analyze_payload_payment',
    status: webhookPayment.status,
    chargeIds: webhookPayment.chargeIds,
    paidChargeId: webhookPayment.paidChargeId || null,
  });

  const result = await syncCheckoutAndActivate(
    record,
    { webhookKind, fingerprint },
    {
      webhookPayment: webhookPayment.status === 'paid' ? webhookPayment : null,
      webhookPayload: payload,
      extraChargeIds: webhookPayment.chargeIds,
      trace,
    }
  );

  diagnostics.steps.push({ step: 'sync_checkout', ...result });
  diagnostics.verificationTrace = trace;

  return {
    processed: true,
    checkoutId: record.pagbankCheckoutId,
    authMethod,
    diagnostics,
    ...result,
  };
}

module.exports = {
  computeWebhookSignature,
  verifyWebhookSignature,
  diagnoseWebhookSignature,
  webhookFingerprint,
  analyzeWebhookPayloadPayment,
  verifyWebhookPayloadOwnership,
  processWebhookNotification,
  syncCheckoutAndActivate,
  findCheckoutRecord,
};
