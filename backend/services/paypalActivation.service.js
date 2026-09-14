/**
 * Apply a verified PayPal capture to a User's subscription. Used by the PayPal webhook
 * (controllers/paypalWebhook.controller.js) as a defense-in-depth self-heal for
 * PAYMENT.CAPTURE.COMPLETED — if the client-driven capture-order flow never reached the server
 * (network drop, closed tab, etc.) but PayPal did complete the charge, this activates it anyway.
 *
 * The client-driven flow (controllers/paypal.controller.js captureOrder) has its own,
 * independently tested copy of the same idempotency rule rather than importing this — the two
 * are deliberately decoupled so a change on one path can't silently affect the other's already
 * fully-tested behavior. Both enforce the same rule: only apply the +1 year grant the first time
 * a given `captureId` is seen for this user (Chunk 8, webhook hardening — capture-order used to
 * unconditionally re-extend the subscription on every call, including replays).
 */
const User = require('../models/User');
const {
  parseTier,
  tierKeyToPlanKidsLimit,
  currencyToPlanRegion,
} = require('./paypalService');
const logger = require('../config/logger');

/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.payerId
 * @param {string} params.captureId
 * @param {string} params.tier - e.g. "1_child_USD"
 * @returns {Promise<{ applied: boolean, alreadyApplied: boolean, user: import('../models/User') }>}
 */
async function activateFromPaypalCapture({ userId, payerId, captureId, tier }) {
  if (!userId || !captureId) {
    throw new Error('userId and captureId are required to activate a PayPal capture');
  }

  const user = await User.findById(userId).select(
    '+paypalPayerId +paypalCaptureId +subscriptionStatus +subscriptionStartDate +subscriptionCurrentPeriodEnd +planKidsLimit +planRegion +paymentProvider'
  );
  if (!user) {
    throw new Error('User not found');
  }

  // Idempotent: this exact capture was already applied to this user. Never re-extend.
  if (user.paypalCaptureId === captureId) {
    return { applied: false, alreadyApplied: true, user };
  }

  const parsed = parseTier(tier);
  const planKidsLimit = parsed ? tierKeyToPlanKidsLimit(parsed.tierKey) : 1;
  const planRegion = parsed ? currencyToPlanRegion(parsed.currency) : 'us';

  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  user.paypalPayerId = payerId || user.paypalPayerId;
  user.paypalCaptureId = captureId;
  user.subscriptionStatus = 'active';
  user.subscriptionStartDate = user.subscriptionStartDate || now;
  user.subscriptionCurrentPeriodEnd = oneYearLater;
  user.planKidsLimit = planKidsLimit;
  user.planRegion = planRegion;
  user.paymentProvider = 'paypal';
  user.subscriptionPlan = 'yearly';

  await user.save();
  logger.info(
    { userId, planKidsLimit, planRegion },
    '[PayPal] Subscription activated from capture'
  );

  return { applied: true, alreadyApplied: false, user };
}

/**
 * A capture this app already activated was refunded or reversed at PayPal. Mark the subscription
 * inactive — but only if it's still the SAME capture that granted access (if the user has since
 * captured a newer order, an old refund must not touch their current, separate subscription).
 * @returns {Promise<{ deactivated: boolean }>}
 */
async function deactivateFromPaypalReversal({ captureId }) {
  if (!captureId) throw new Error('captureId is required');

  const user = await User.findOne({ paypalCaptureId: captureId }).select(
    '+paypalCaptureId +subscriptionStatus +paymentProvider'
  );
  if (!user || user.paymentProvider !== 'paypal') {
    return { deactivated: false };
  }

  user.subscriptionStatus = 'canceled';
  await user.save();
  logger.info({ userId: String(user._id), captureId }, '[PayPal] Subscription deactivated (refund/reversal)');
  return { deactivated: true };
}

module.exports = { activateFromPaypalCapture, deactivateFromPaypalReversal };
