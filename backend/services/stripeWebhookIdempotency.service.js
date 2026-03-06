/**
 * Idempotency for Stripe webhooks: ensure each event is processed at most once.
 * Stripe can deliver the same event multiple times; we key by event.id.
 */

const StripeWebhookEvent = require('../models/StripeWebhookEvent');

/**
 * Returns true if this event has already been processed (skip re-processing).
 *
 * @param {string} eventId - Stripe event ID (e.g. evt_xxx)
 * @returns {Promise<boolean>}
 */
async function hasProcessedEvent(eventId) {
  if (!eventId) return false;
  const doc = await StripeWebhookEvent.findOne({ eventId }).lean();
  return Boolean(doc);
}

/**
 * Record an event as processed. Call after successfully handling the event.
 * Safe to call multiple times for the same eventId (unique index will prevent duplicate insert).
 *
 * @param {string} eventId - Stripe event ID
 * @param {string} type - Stripe event type (e.g. checkout.session.completed)
 * @returns {Promise<void>}
 */
async function recordProcessedEvent(eventId, type) {
  if (!eventId || !type) return;
  try {
    await StripeWebhookEvent.create({ eventId, type: String(type) });
  } catch (err) {
    // Duplicate key (already recorded) is fine - another request may have recorded first
    if (err.code === 11000) return;
    throw err;
  }
}

module.exports = {
  hasProcessedEvent,
  recordProcessedEvent,
};
