/**
 * PagBank Checkout controller — Brazil Family Plan.
 *
 * GET  /api/pagseguro/config
 * POST /api/pagseguro/create-checkout
 * GET  /api/pagseguro/checkout/:checkoutId — success page verification
 * POST /api/pagseguro/webhooks/checkout|payment — registered in server.js (raw body)
 */

const User = require('../models/User');
const PagSeguroCheckout = require('../models/PagSeguroCheckout');
const { generateToken } = require('../services/auth.services');
const {
  getPagseguroConfig,
  createPagbankCheckout,
  buildCheckoutLineItems,
  generateReferenceId,
  isPagseguroConfigured,
  getPagbankCheckout,
  resolveCheckoutPaymentStatus,
} = require('../services/pagseguro.service');
const { processWebhookNotification } = require('../services/pagseguroWebhook.service');
const { activateUserFromPagseguroCheckout } = require('../services/pagseguroActivation.service');
const { buildVerificationDiagnostics } = require('../services/pagseguroDiagnostics.service');

/** Internal only — set PAGSEGURO_DEBUG=true on EC2 to log verify/webhook diagnostics. */
function logPagseguroDiagnostics(label, data) {
  if (process.env.PAGSEGURO_DEBUG === 'true' && data) {
    console.info('[PagSeguro]', label, JSON.stringify(data));
  }
}

/**
 * GET /api/pagseguro/config
 */
exports.getConfig = async (req, res, next) => {
  try {
    return res.json(getPagseguroConfig());
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/pagseguro/create-checkout
 */
exports.createCheckout = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const user = req.user;

    if (!userId || !user?.email) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!isPagseguroConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'PagBank checkout is not available. Please try again later.',
      });
    }

    const {
      childCount,
      addBox = false,
      taxId,
      phone,
      successUrl,
      cancelUrl,
      termsVersion,
    } = req.body || {};

    if (childCount === undefined || childCount === null) {
      return res.status(400).json({
        success: false,
        message: 'childCount is required.',
      });
    }

    if (!taxId) {
      return res.status(400).json({
        success: false,
        message: 'taxId (CPF) is required for PagBank checkout.',
      });
    }

    if (!phone?.area || !phone?.number) {
      return res.status(400).json({
        success: false,
        message: 'phone with area (DDD) and number is required.',
      });
    }

    const count = Number(childCount);
    const withBox = Boolean(addBox);
    const { totalCents } = buildCheckoutLineItems(count, withBox);
    const referenceId = generateReferenceId();

    const pending = await PagSeguroCheckout.create({
      referenceId,
      userId,
      childCount: count,
      addBox: withBox,
      amountCents: totalCents,
      currency: 'BRL',
      status: 'pending',
      termsVersion: termsVersion || undefined,
    });

    try {
      const result = await createPagbankCheckout({
        referenceId,
        user,
        childCount: count,
        addBox: withBox,
        taxId,
        phone,
        successUrl,
        cancelUrl,
        termsVersion,
      });

      pending.pagbankCheckoutId = result.checkoutId;
      pending.payUrl = result.payUrl;
      await pending.save();

      const normalizedCpf = String(taxId).replace(/\D/g, '');
      if (normalizedCpf) {
        await User.findByIdAndUpdate(userId, { taxId: normalizedCpf }).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        message: 'PagBank checkout created.',
        checkoutId: result.checkoutId,
        referenceId: result.referenceId,
        payUrl: result.payUrl,
        amountCents: result.amountCents,
        expirationDate: result.expirationDate,
      });
    } catch (err) {
      await PagSeguroCheckout.deleteOne({ _id: pending._id }).catch(() => {});
      const status = err.statusCode === 400 ? 400 : 502;
      if (err.internalDetail) {
        console.error('[PagSeguro] create-checkout failed:', err.internalDetail);
      }
      return res.status(status).json({
        success: false,
        message: err.message || 'Failed to create PagBank checkout.',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pagseguro/checkout/:checkoutId
 * Success-page verification (fallback if webhook is delayed).
 */
exports.getCheckoutDetails = async (req, res, next) => {
  try {
    const { checkoutId } = req.params;
    if (!checkoutId?.trim()) {
      return res.status(400).json({ success: false, message: 'checkoutId is required.' });
    }

    if (!isPagseguroConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'PagBank is not configured.',
      });
    }

    const record = await PagSeguroCheckout.findOne({
      pagbankCheckoutId: checkoutId.trim(),
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Checkout session not found.' });
    }

    const clientIp =
      req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;

    const existingUser = await User.findById(record.userId).select('-password');
    const alreadySettled =
      record.status === 'paid' ||
      Boolean(record.paidAt) ||
      (existingUser?.subscriptionStatus === 'active' &&
        existingUser?.paymentProvider === 'pagseguro' &&
        existingUser?.pagseguroCheckoutId === record.pagbankCheckoutId);

    if (alreadySettled) {
      record.status = 'paid';
      record.paidAt = record.paidAt || new Date();
      await record.save();
      await activateUserFromPagseguroCheckout(record, {
        chargeId: record.chargeIds?.[0],
        setTermsIp: clientIp,
      });

      const user = await User.findById(record.userId).select('-password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      if (!user.termsAcceptedIp && clientIp) {
        user.termsAcceptedIp = clientIp;
        await user.save();
      }

      const token = generateToken(user._id);
      const userResponse = await User.findById(record.userId).select('-password').lean();

      return res.json({
        success: true,
        user: userResponse,
        token,
        checkoutId: record.pagbankCheckoutId,
      });
    }

    let apiCheckout;
    try {
      apiCheckout = await getPagbankCheckout(checkoutId.trim());
    } catch (err) {
      const status = err.statusCode === 404 ? 404 : 502;
      return res.status(status).json({
        success: false,
        message: err.message || 'Unable to verify checkout with PagBank.',
      });
    }

    const trace = [];
    const analysis = await resolveCheckoutPaymentStatus(apiCheckout, {
      storedChargeIds: record.chargeIds || [],
      referenceId: record.referenceId,
      trace,
    });

    const webhookIndicatesPaid =
      (record.webhookEvents?.length || 0) > 0 && (record.chargeIds?.length || 0) > 0;
    const effectiveStatus =
      analysis.status === 'paid' || webhookIndicatesPaid ? 'paid' : analysis.status;

    record.status = effectiveStatus;
    if (analysis.chargeIds.length) {
      record.chargeIds = [...new Set([...(record.chargeIds || []), ...analysis.chargeIds])];
    }

    const diagnostics = buildVerificationDiagnostics({
      record,
      apiCheckout,
      analysis: { ...analysis, status: effectiveStatus },
      trace,
      ordersLookup: analysis.ordersLookup || null,
    });
    logPagseguroDiagnostics('checkout-verify', diagnostics);

    if (effectiveStatus === 'paid') {
      record.paidAt = record.paidAt || new Date();
      await record.save();
      await activateUserFromPagseguroCheckout(record, {
        chargeId: analysis.paidChargeId || record.chargeIds?.[0],
        setTermsIp: clientIp,
      });
    } else {
      await record.save();
      return res.status(400).json({
        success: false,
        message: 'Payment not completed yet.',
        status: effectiveStatus,
      });
    }

    const user = await User.findById(record.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.termsAcceptedIp && clientIp) {
      user.termsAcceptedIp = clientIp;
      await user.save();
    }

    const token = generateToken(user._id);
    const userResponse = await User.findById(record.userId).select('-password').lean();

    return res.json({
      success: true,
      user: userResponse,
      token,
      checkoutId: record.pagbankCheckoutId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/pagseguro/webhooks/checkout
 */
exports.handleCheckoutWebhook = async (req, res) => {
  try {
    const result = await processWebhookNotification({
      rawBody: req.pagseguroRawBody,
      authenticityToken: req.pagseguroAuthenticityToken,
      webhookKind: 'checkout',
    });
    return res.status(200).json({
      received: true,
      processed: Boolean(result?.processed),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logPagseguroDiagnostics('webhook-checkout-error', error.diagnostics);
    if (status >= 500) {
      console.error('[PagSeguro Webhook] checkout error:', error.message);
    }
    return res.status(status).json({
      success: false,
      message: error.message || 'Webhook processing failed.',
    });
  }
};

/**
 * POST /api/pagseguro/webhooks/payment
 */
exports.handlePaymentWebhook = async (req, res) => {
  try {
    const result = await processWebhookNotification({
      rawBody: req.pagseguroRawBody,
      authenticityToken: req.pagseguroAuthenticityToken,
      webhookKind: 'payment',
    });
    return res.status(200).json({
      received: true,
      processed: Boolean(result?.processed),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logPagseguroDiagnostics('webhook-payment-error', error.diagnostics);
    if (status >= 500) {
      console.error('[PagSeguro Webhook] payment error:', error.message);
    }
    return res.status(status).json({
      success: false,
      message: error.message || 'Webhook processing failed.',
    });
  }
};
