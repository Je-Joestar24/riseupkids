const express = require('express');
const {
  createParentSignupSession,
  getCheckoutSessionDetails,
  cancelUserSubscription,
  handleWebhook,
} = require('../controllers/stripe.controller');
const { protect } = require('../middleware/auth');
const stripeWebhook = require('../middleware/stripeWebhook');

const router = express.Router();

// Webhook route (must be before other routes, no auth needed)
// Note: Raw body parsing is handled in server.js before express.json()
router.post('/webhook', stripeWebhook, handleWebhook);

// Regular routes:
// - Create Checkout Session for parent signup
// - Retrieve Checkout Session details for success page verification
// - Cancel subscription (requires authentication)

router.post('/parent-signup-session', createParentSignupSession);
router.get('/checkout-session/:sessionId', getCheckoutSessionDetails);
router.post('/cancel-subscription', protect, cancelUserSubscription);

module.exports = router;
