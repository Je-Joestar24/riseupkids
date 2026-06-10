/**
 * PagBank diagnostics for server-side logging (PAGSEGURO_DEBUG=true). Not exposed in API responses.
 */

const { PAGSEGURO_ENV } = require('../config/pagseguro');
const { extractCheckoutCharges } = require('./pagseguro.service');

function summarizeCharges(entity) {
  return extractCheckoutCharges(entity).map((c) => ({
    id: c.id,
    status: c.status,
  }));
}

function buildLocalRecordSnapshot(record) {
  if (!record) return null;
  return {
    referenceId: record.referenceId,
    pagbankCheckoutId: record.pagbankCheckoutId,
    localStatus: record.status,
    chargeIds: record.chargeIds || [],
    paidAt: record.paidAt || null,
    webhookEventsCount: record.webhookEvents?.length || 0,
    lastWebhookAt: record.webhookEvents?.length
      ? record.webhookEvents[record.webhookEvents.length - 1].receivedAt
      : null,
  };
}

function buildPagbankCheckoutSnapshot(apiCheckout) {
  if (!apiCheckout) return null;
  return {
    id: apiCheckout.id,
    status: apiCheckout.status,
    reference_id: apiCheckout.reference_id,
    charges: summarizeCharges(apiCheckout),
  };
}

function buildVerificationDiagnostics({
  record,
  apiCheckout,
  analysis,
  trace = [],
  ordersLookup = null,
}) {
  return {
    env: PAGSEGURO_ENV,
    local: buildLocalRecordSnapshot(record),
    pagbankCheckout: buildPagbankCheckoutSnapshot(apiCheckout),
    resolution: analysis
      ? {
          status: analysis.status,
          chargeIds: analysis.chargeIds || [],
          paidChargeId: analysis.paidChargeId || null,
        }
      : null,
    ordersLookup,
    trace,
    likelyCauses:
      analysis?.status === 'paid'
        ? []
        : [
            'Webhook may have returned 401 (signature token mismatch or body modified by CloudFront).',
            'Payment may exist on ORDE_ (order) while GET /checkouts still shows pending.',
            'Set PAGSEGURO_WEBHOOK_TOKEN to the iBanking notification token from PagBank portal.',
          ],
  };
}

function attachDiagnostics(error, diagnostics) {
  if (diagnostics) {
    error.diagnostics = diagnostics;
  }
  return error;
}

module.exports = {
  buildLocalRecordSnapshot,
  buildPagbankCheckoutSnapshot,
  buildVerificationDiagnostics,
  attachDiagnostics,
  summarizeCharges,
};
