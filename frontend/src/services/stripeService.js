import api from '../api/axios';

const stripeService = {
  /**
   * Create a Stripe Checkout Session for parent signup.
   * Backend: POST /api/stripe/parent-signup-session
   */
  createParentSignupSession: async ({ name, email, password }) => {
    const response = await api.post('/stripe/parent-signup-session', {
      name,
      email,
      password,
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
