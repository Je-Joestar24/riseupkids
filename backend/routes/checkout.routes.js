const express = require('express');
const { getConfig, getPricing, createSession, getSessionDetails } = require('../controllers/checkout.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/** GET /api/checkout/config – public; min/max children, supported locales */
router.get('/config', getConfig);

/** GET /api/checkout/pricing – public; the one price list (annual, in cents) the checkout pages show */
router.get('/pricing', getPricing);

/** POST /api/checkout/create-session – create Family Plan Stripe session; parent only */
router.post('/create-session', protect, authorize('parent'), createSession);

/** GET /api/checkout/session/:sessionId – success page: verify Family Plan payment, set termsAcceptedIp, return user + token */
router.get('/session/:sessionId', getSessionDetails);

module.exports = router;
