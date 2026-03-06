/**
 * Checkout controller: config and Family Plan Checkout Session.
 * Serves the riseupkids-sale web app.
 */

const User = require('../models/User');
const { getCheckoutConfig, createFamilyPlanCheckoutSession } = require('../services/checkout.services');
const { getCheckoutSession } = require('../services/stripe.services');
const { generateToken } = require('../services/auth.services');

/**
 * GET /api/checkout/config
 * Returns min/max children and supported locales (no auth required).
 */
exports.getConfig = async (req, res, next) => {
  try {
    const config = getCheckoutConfig();
    return res.json(config);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/checkout/create-session
 * Creates a Stripe Checkout Session for Family Plan (one-time payment).
 * Requires authenticated parent.
 *
 * Body: { region, childCount, addBox?, successUrl?, cancelUrl?, termsVersion? }
 */
exports.createSession = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    const userEmail = req.user?.email;
    if (!userId || !userEmail) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const {
      region,
      childCount,
      addBox = false,
      successUrl,
      cancelUrl,
      termsVersion,
    } = req.body || {};

    if (!region || (childCount === undefined || childCount === null)) {
      return res.status(400).json({
        message: 'region and childCount are required.',
      });
    }

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || process.env.SALE_APP_BASE_URL || 'http://localhost:3000';
    const finalSuccessUrl = successUrl || `${frontendBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${frontendBaseUrl}/checkout/cancel`;

    const result = await createFamilyPlanCheckoutSession({
      userId,
      userEmail,
      region,
      childCount: Number(childCount),
      addBox: Boolean(addBox),
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      termsVersion: termsVersion || undefined,
    });

    return res.status(201).json({
      message: 'Checkout session created.',
      sessionId: result.sessionId,
      url: result.url,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/checkout/session/:sessionId
 * Success-page verification for Family Plan. Verifies payment, sets termsAcceptedIp from client,
 * returns user + token so frontend can log the parent in (same shape as stripe getCheckoutSessionDetails).
 */
exports.getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required.' });
    }

    const session = await getCheckoutSession(sessionId);
    const userId = session?.metadata?.userId;
    const isFamilyPlan =
      session?.mode === 'payment' &&
      session?.metadata?.familyPlan === '1' &&
      session?.payment_status === 'paid' &&
      session?.status === 'complete';

    if (!isFamilyPlan || !userId) {
      return res.status(400).json({
        message: 'Invalid or incomplete session.',
      });
    }

    const user = await User.findById(userId).select('+stripeCustomerId');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
    let updated = false;
    if (!user.termsAcceptedIp && clientIp) {
      user.termsAcceptedIp = clientIp;
      updated = true;
    }
    if (!user.termsAcceptedAt) {
      user.termsAcceptedAt = new Date();
      updated = true;
    }
    if (!user.termsVersion && session.metadata?.terms_version) {
      user.termsVersion = session.metadata.terms_version;
      updated = true;
    }
    if (updated) await user.save();

    const token = generateToken(user._id);
    const userResponse = await User.findById(userId)
      .select('-password')
      .lean();
    return res.json({
      success: true,
      user: userResponse,
      token,
    });
  } catch (error) {
    next(error);
  }
};
