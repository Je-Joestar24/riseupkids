const { stripe, STRIPE_WEBHOOK_SECRET } = require('../config/stripe');

/**
 * Stripe Webhook Middleware
 * 
 * Handles raw body parsing and signature verification for Stripe webhooks.
 * Must be used BEFORE express.json() middleware.
 */
const stripeWebhook = (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('[Stripe Webhook] Missing Stripe signature header');
    return res.status(400).json({
      success: false,
      message: 'Missing Stripe signature header',
    });
  }

  if (!stripe) {
    console.error('[Stripe Webhook] Stripe is not configured');
    return res.status(500).json({
      success: false,
      message: 'Stripe is not configured',
    });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set. Please add it to your .env file.');
    console.error('[Stripe Webhook] Get the webhook secret from: stripe listen --forward-to localhost:5000/api/stripe/webhook');
    return res.status(500).json({
      success: false,
      message: 'Webhook secret not configured. Check your .env file for STRIPE_WEBHOOK_SECRET',
    });
  }

  let event;

  try {
    // Verify webhook signature using raw body
    // req.body should be a Buffer from express.raw() middleware
    // If it's not a Buffer, try to convert it
    let body = req.body;
    if (typeof body === 'string') {
      body = Buffer.from(body);
    }
    
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    console.error('[Stripe Webhook] Make sure STRIPE_WEBHOOK_SECRET matches the secret from: stripe listen');
    return res.status(400).json({
      success: false,
      message: `Webhook signature verification failed: ${err.message}. Make sure your STRIPE_WEBHOOK_SECRET is correct.`,
    });
  }

  // Attach verified event to request
  req.stripeEvent = event;
  next();
};

module.exports = stripeWebhook;
