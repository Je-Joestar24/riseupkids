/**
 * PayPal one-time checkout controller (Phase 2).
 *
 * POST /api/paypal/create-order – create PayPal order for tier; returns orderID.
 * POST /api/paypal/capture-order – capture order and update User (subscription, plan, payer id).
 *
 * planKidsLimit and planRegion are set from the tier (e.g. 1_child_USD → limit 1, region us).
 * Subscription period: +1 year from capture time for subscriptionCurrentPeriodEnd.
 */

const User = require('../models/User');
const {
  createPaypalOrder,
  capturePaypalOrder,
  getValidTiers,
  getValidPlanTypes,
  buildTier,
  parseTier,
  currencyToPlanRegion,
  tierKeyToPlanKidsLimit,
} = require('../services/paypalService');

/**
 * POST /api/paypal/create-order
 * Body (option A): { tier: "1_child_USD" }
 * Body (option B): { childCount: 1, currency: "USD", planType: "yearly" | "pay_in_4" }
 * Returns: { success: true, orderID } or { success: false, message }
 */
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const body = req.body || {};
    const { tier: tierFromBody, childCount, currency, planType } = body;

    let canonical;

    if (tierFromBody?.trim()) {
      const validTiers = getValidTiers();
      const trimmed = tierFromBody.trim();
      canonical = validTiers.find((t) => t.toLowerCase() === trimmed?.toLowerCase());
      if (!canonical) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Valid values: ' + getValidTiers().join(', '),
        });
      }
    } else if (
      childCount != null &&
      currency?.trim() &&
      planType?.trim()
    ) {
      const validPlanTypes = getValidPlanTypes();
      const planTypeLower = planType.trim().toLowerCase();
      if (!validPlanTypes.includes(planTypeLower)) {
        return res.status(400).json({
          success: false,
          message: `Invalid planType. Use one of: ${validPlanTypes.join(', ')}`,
        });
      }
      try {
        canonical = buildTier(childCount, currency.trim(), planTypeLower);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid childCount or currency.',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either tier or (childCount, currency, planType). planType must be "yearly" or "pay_in_4".',
      });
    }

    console.log('[PayPal] Create order attempt – userId=%s, tier=%s', userId, canonical);
    const { orderID } = await createPaypalOrder(canonical, userId);
    console.log('[PayPal] Order created – orderID=%s', orderID);

    return res.status(201).json({
      success: true,
      orderID,
    });
  } catch (error) {
    console.error('[PayPal] Create order error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create PayPal order.',
    });
  }
};

/**
 * POST /api/paypal/capture-order
 * Body: { orderID: "..." }
 * Captures the order, then updates User: paypalPayerId, subscriptionStatus, dates, planKidsLimit, planRegion, paymentProvider.
 */
exports.captureOrder = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { orderID } = req.body || {};
    if (!orderID || typeof orderID !== 'string' || !orderID.trim()) {
      return res.status(400).json({
        success: false,
        message: 'orderID is required.',
      });
    }

    console.log('[PayPal] Capture order attempt – userId=%s, orderID=%s', userId, orderID);
    const result = await capturePaypalOrder(orderID.trim(), userId);

    const user = await User.findById(userId).select(
      '+paypalPayerId +paypalCaptureId +subscriptionStatus +subscriptionStartDate +subscriptionCurrentPeriodEnd +planKidsLimit +planRegion +paymentProvider'
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const parsed = parseTier(result.tier);
    const planKidsLimit = parsed ? tierKeyToPlanKidsLimit(parsed.tierKey) : 1;
    const planRegion = parsed ? currencyToPlanRegion(parsed.currency) : 'us';

    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    user.paypalPayerId = result.payerId || user.paypalPayerId;
    user.paypalCaptureId = result.captureId || user.paypalCaptureId;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = user.subscriptionStartDate || now;
    user.subscriptionCurrentPeriodEnd = oneYearLater;
    user.planKidsLimit = planKidsLimit;
    user.planRegion = planRegion;
    user.paymentProvider = 'paypal';
    user.subscriptionPlan = 'yearly';

    await user.save();
    console.log(
      '[PayPal] User update success – userId=%s, planKidsLimit=%s, planRegion=%s',
      userId,
      planKidsLimit,
      planRegion
    );

    return res.status(200).json({
      success: true,
      message: result.alreadyCaptured ? 'Order was already captured; subscription updated.' : 'Order captured and subscription activated.',
    });
  } catch (error) {
    console.error('[PayPal] Capture order error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to capture PayPal order.',
    });
  }
};
