import api from '../api/axios';

/** Terms version sent with checkout for legal record; bump when terms change. */
export const TERMS_VERSION = 'terms_v1_2026-02-10';

const stripeService = {
  /**
   * Create a Stripe Checkout Session for parent signup.
   * Backend: POST /api/stripe/parent-signup-session
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} [params.terms_version] - Optional; defaults to TERMS_VERSION
   */
  createParentSignupSession: async ({ name, email, password, terms_version }) => {
    const response = await api.post('/stripe/parent-signup-session', {
      name,
      email,
      password,
      terms_version: terms_version ?? TERMS_VERSION,
    });
    return response.data;
  },

  /**
   * Verify a Stripe Checkout Session after returning from Stripe.
   * Backend: GET /api/stripe/checkout-session/:sessionId
   */
  verifyCheckoutSession: async (sessionId) => {
    const response = await api.get(`/stripe/checkout-session/${sessionId}`);
    return response.data;
  },

  /**
   * Cancel the current user's subscription.
   * Backend: POST /api/stripe/cancel-subscription
   * Sets cancel_at_period_end to true, so subscription cancels at period end.
   */
  cancelSubscription: async () => {
    const response = await api.post('/stripe/cancel-subscription');
    return response.data;
  },
};

export default stripeService;
