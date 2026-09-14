/**
 * Idempotency for PayPal webhooks: ensure each event is processed at most once.
 * PayPal can deliver the same event multiple times; keyed by event.id (mirrors
 * services/stripeWebhookIdempotency.service.js).
 */

const PayPalWebhookEvent = require('../models/PayPalWebhookEvent');

/**
 * @param {string} eventId - PayPal event ID (e.g. WH-XXXXXXX)
 * @returns {Promise<boolean>}
 */
async function hasProcessedEvent(eventId) {
  if (!eventId) return false;
  const doc = await PayPalWebhookEvent.findOne({ eventId }).lean();
  return Boolean(doc);
}

/**
 * Record an event as processed. Safe to call more than once for the same eventId — the unique
 * index prevents a duplicate insert if two requests race.
 * @param {string} eventId
 * @param {string} eventType - e.g. PAYMENT.CAPTURE.COMPLETED
 * @returns {Promise<void>}
 */
async function recordProcessedEvent(eventId, eventType) {
  if (!eventId || !eventType) return;
  try {
    await PayPalWebhookEvent.create({ eventId, eventType: String(eventType) });
  } catch (err) {
    if (err.code === 11000) return; // already recorded by a concurrent delivery
    throw err;
  }
}

module.exports = { hasProcessedEvent, recordProcessedEvent };
