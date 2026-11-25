/**
 * Checkout controller: config and Family Plan Checkout Session.
 * Serves the riseupkids-sale web app.
 */

const User = require('../models/User');
const { getCheckoutConfig, getCheckoutPricing, createFamilyPlanCheckoutSession } = require('../services/checkout.services');
const { getCheckoutSession } = require('../services/stripe.services');
const { generateToken, accessTokenExpiryForRole } = require('../services/auth.services');
const sessionService = require('../services/session.services');
const { setRefreshCookie } = require('../config/refreshCookie');

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
 * GET /api/checkout/pricing
 * The Family Plan prices the checkout pages show (no auth required): annual price per region and number of
 * children, in whole cents. The pages keep no price numbers of their own, so what is shown is what is charged.
 * Monthly prices are never included until the monthly option is switched on in config/familyPlanPricing.js.
 */
exports.getPricing = async (req, res, next) => {
  try {
    return res.json(getCheckoutPricing());
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/checkout/create-session
 * Creates a Stripe Checkout Session for Family Plan (one-time annual payment).
 * Requires authenticated parent.
 *
 * Body: { region, childCount, successUrl?, cancelUrl?, termsVersion? }
 * childCount must be 1 to 4: anything else is a 400 (never rounded into a plan). An activity box field sent by an
 * old app is ignored: the box no longer exists.
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
      // addBox = false,   // activity box: switched off (see docs/ACTIVITY_BOX_DISABLED.md)
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
      childCount,
      // addBox: Boolean(addBox),   // activity box: switched off, see docs/ACTIVITY_BOX_DISABLED.md
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

    const user = await User.findById(userId).select('+stripeCustomerId +tokenVersion');
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

    const token = generateToken(user._id, user.tokenVersion || 0, accessTokenExpiryForRole(user.role));
    const { plainToken: refreshToken } = await sessionService.issueRefreshToken(user._id, {
      userAgent: req.headers['user-agent'] || null,
      ip: clientIp,
    });
    setRefreshCookie(res, refreshToken, sessionService.REFRESH_TOKEN_TTL_MS);
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
