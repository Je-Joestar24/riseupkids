/**
 * PayPal webhook handler (Chunk 8 — webhook hardening).
 *
 * POST /api/paypal/webhook
 * Signature already verified by middleware/paypalWebhook.js before this runs (fails closed:
 * this handler only ever sees a request PayPal actually sent). Mirrors the
 * verify-first / idempotency-check-first / respond-2xx-only-after-persisted pattern used by
 * controllers/stripe.controller.js#handleWebhook.
 *
 * PAYMENT.CAPTURE.COMPLETED is a defense-in-depth self-heal for captures the client-driven
 * capture-order flow never reached (network drop, closed tab, etc.) — see
 * services/paypalActivation.service.js for why this is deliberately independent from
 * controllers/paypal.controller.js's own capture-order idempotency.
 * PAYMENT.CAPTURE.REFUNDED / REVERSED are out-of-band changes the capture-order flow can never
 * see on its own (a refund happens later, outside any request from the app).
 */

const { hasProcessedEvent, recordProcessedEvent } = require('../services/paypalWebhookIdempotency.service');
const { activateFromPaypalCapture, deactivateFromPaypalReversal } = require('../services/paypalActivation.service');
const logger = require('../config/logger');

/**
 * The refund/reversal event's `resource` is the refund (or reversed capture) object, not the
 * original capture. The capture id lives in the `up` HATEOAS link
 * (".../v2/payments/captures/{id}") for a refund; for a reversed capture, `resource` already IS
 * the capture, so `resource.id` is correct there too — checking the `up` link first with a
 * `resource.id` fallback handles both PayPal payload shapes.
 */
function extractCaptureId(resource) {
  if (!resource) return null;
  const upLink = Array.isArray(resource.links) ? resource.links.find((l) => l.rel === 'up') : null;
  if (upLink?.href) {
    const match = upLink.href.match(/\/captures\/([^/?]+)/);
    if (match) return match[1];
  }
  return resource.id || null;
}

/**
 * custom_id is set at order-create time as `{userId}|{tier}` (see services/paypalService.js —
 * pipe-separated because tier itself contains underscores, e.g. "1_child_USD").
 */
function parseCustomId(customId) {
  if (!customId || typeof customId !== 'string' || !customId.includes('|')) return null;
  const [userId, tier] = customId.split('|');
  if (!userId || !tier) return null;
  return { userId, tier };
}

exports.handleWebhook = async (req, res) => {
  try {
    const event = req.paypalWebhookEvent;
    if (!event || !event.id) {
      return res.status(400).json({ success: false, message: 'No PayPal event found in request' });
    }

    if (await hasProcessedEvent(event.id)) {
      logger.info('[PayPal Webhook] Already processed event %s, acknowledging', event.id);
      return res.status(200).json({ received: true });
    }

    logger.info('[PayPal Webhook] Received event: %s (ID: %s)', event.event_type, event.id);

    const acknowledge = async () => {
      await recordProcessedEvent(event.id, event.event_type);
      return res.status(200).json({ received: true });
    };

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = event.resource;
        const captureId = capture?.id;
        const parsed = parseCustomId(capture?.custom_id);
        const payerId = capture?.payer?.payer_id;

        if (!captureId || !parsed) {
          logger.error(
            { eventId: event.id },
            '[PayPal Webhook] Capture completed event missing captureId/custom_id — cannot self-heal'
          );
          return await acknowledge();
        }

        try {
          const { applied, alreadyApplied } = await activateFromPaypalCapture({
            userId: parsed.userId,
            payerId,
            captureId,
            tier: parsed.tier,
          });
          logger.info(
            { eventId: event.id, userId: parsed.userId, applied, alreadyApplied },
            '[PayPal Webhook] Capture completed processed'
          );
        } catch (err) {
          // Do not fail the webhook response over a self-heal error (e.g. unknown userId) —
          // the client-driven capture-order flow is the primary path and may have already
          // handled this capture under a since-deleted or different user record.
          logger.error({ err, eventId: event.id }, '[PayPal Webhook] Capture self-heal failed');
        }
        return await acknowledge();
      }

      case 'PAYMENT.CAPTURE.REFUNDED':
      case 'PAYMENT.CAPTURE.REVERSED': {
        const captureId = extractCaptureId(event.resource);
        if (!captureId) {
          logger.error({ eventId: event.id }, '[PayPal Webhook] Refund/reversal event missing capture id');
          return await acknowledge();
        }

        try {
          const { deactivated } = await deactivateFromPaypalReversal({ captureId });
          logger.info({ eventId: event.id, captureId, deactivated }, '[PayPal Webhook] Refund/reversal processed');
        } catch (err) {
          logger.error({ err, eventId: event.id, captureId }, '[PayPal Webhook] Refund/reversal handling failed');
        }
        return await acknowledge();
      }

      default:
        logger.info('[PayPal Webhook] Unhandled event type %s (ID: %s) — acknowledging', event.event_type, event.id);
        return await acknowledge();
    }
  } catch (error) {
    logger.error({ err: error }, '[PayPal Webhook] Unhandled error');
    return res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};
