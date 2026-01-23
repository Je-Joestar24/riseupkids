const { stripe, STRIPE_PRICE_ID_YEARLY } = require('../config/stripe');

/**
 * Phase 1 Stripe services
 *
 * - createParentSignupCheckoutSession: used when a parent submits the signup form.
 *   It creates a Stripe Checkout Session for the recurring price defined in
 *   STRIPE_PRICE_ID_YEARLY (monthly plan with yearly commitment as a business rule).
 */

/**
 * Create a Checkout Session for a new parent signup.
 *
 * @param {Object} options
 * @param {string} options.email - Parent email.
 * @param {string} options.userId - Newly created User ID (MongoDB ObjectId as string).
 * @param {string} options.successUrl - Frontend success URL (must include {CHECKOUT_SESSION_ID} placeholder if desired).
 * @param {string} options.cancelUrl - Frontend cancel URL.
 * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
 */
async function createParentSignupCheckoutSession({
  email,
  userId,
  successUrl,
  cancelUrl,
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  if (!STRIPE_PRICE_ID_YEARLY) {
    throw new Error('Stripe price is not configured. STRIPE_PRICE_ID_YEARLY is missing.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price: STRIPE_PRICE_ID_YEARLY,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      role: 'parent',
    },
  });

  return session;
}

/**
 * Retrieve a Checkout Session by ID (used on success page verification).
 *
 * @param {string} sessionId
 * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
 */
async function getCheckoutSession(sessionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });
}

/**
 * Cancel a Stripe subscription.
 * Sets cancel_at_period_end to true so subscription cancels at the end of the current period.
 *
 * @param {string} subscriptionId - Stripe Subscription ID
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
async function cancelSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  if (!subscriptionId) {
    throw new Error('Subscription ID is required.');
  }

  // Cancel at period end (respects yearly commitment)
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Retrieve a Stripe subscription by ID.
 *
 * @param {string} subscriptionId - Stripe Subscription ID
 * @returns {Promise<import('stripe').Stripe.Subscription>}
 */
async function getSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  if (!subscriptionId) {
    throw new Error('Subscription ID is required.');
  }

  return stripe.subscriptions.retrieve(subscriptionId);
}

module.exports = {
  createParentSignupCheckoutSession,
  getCheckoutSession,
  cancelSubscription,
  getSubscription,
};
