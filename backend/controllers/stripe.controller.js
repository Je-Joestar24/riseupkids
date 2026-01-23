const User = require('../models/User');
const {
  createParentSignupCheckoutSession,
  getCheckoutSession,
  cancelSubscription,
  getSubscription,
} = require('../services/stripe.services');
const { generateToken } = require('../services/auth.services');

/**
 * Phase 1 Stripe controller
 *
 * Endpoints:
 * - POST /api/stripe/parent-signup-session
 * - GET  /api/stripe/checkout-session/:sessionId
 *
 * Webhooks and full lifecycle handling will be implemented in later phases.
 */

/**
 * POST /api/stripe/parent-signup-session
 *
 * Create a parent user in "inactive" subscription state, then create a Stripe
 * Checkout Session for the configured recurring price.
 *
 * Expected body:
 * - name
 * - email
 * - password
 */
exports.createParentSignupSession = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        message: 'An account with this email already exists. Please log in instead.',
      });
    }

    // Create a new parent user with inactive subscription
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'parent',
      isActive: true, // overall user active flag (auth); subscription is tracked separately
      subscriptionStatus: 'inactive',
    });

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const successUrl = `${frontendBaseUrl}/parent/signup/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendBaseUrl}/parent/signup/cancel`;

    const session = await createParentSignupCheckoutSession({
      email: user.email,
      userId: String(user._id),
      successUrl,
      cancelUrl,
    });

    return res.status(201).json({
      message: 'Checkout session created successfully.',
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    // Let the global error handler format the error.
    next(error);
  }
};

/**
 * GET /api/stripe/checkout-session/:sessionId
 *
 * Phase 1:
 *  - Retrieve Stripe Checkout Session
 *  - Return basic user information
 *  - If session is paid and user is valid, issue a JWT so the parent can be
 *    logged in instantly after successful payment.
 */
exports.getCheckoutSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required.' });
    }

    const session = await getCheckoutSession(sessionId);

    const userId = session?.metadata?.userId;
    let user = null;
    let token = null;

    if (userId) {
      // Get user with subscription fields (can't mix exclusion and inclusion in MongoDB)
      user = await User.findById(userId).select('+stripeSubscriptionId +subscriptionStatus +subscriptionCurrentPeriodEnd +subscriptionStartDate +stripeCustomerId');
      // Remove password from response
      if (user && user.password) {
        user.password = undefined;
      }
    }

    // Determine if the payment is completed and issue token if appropriate.
    // For subscriptions via Checkout, we typically check:
    // - session.payment_status === 'paid'
    // - session.status is 'complete'
    const isPaid =
      session.payment_status === 'paid' &&
      session.status === 'complete';

    if (isPaid && user && user.isActive && user.role === 'parent') {
      // Update subscription status if not already active (fallback if webhook hasn't fired yet)
      if (user.subscriptionStatus !== 'active' && session.subscription) {
        try {
          // session.subscription might be a string ID or an expanded object
          const subscriptionId = typeof session.subscription === 'string' 
            ? session.subscription 
            : session.subscription.id;
          
          if (!subscriptionId) {
            console.error('[Stripe] No subscription ID found in session');
          } else {
            // Get full subscription details from Stripe
            const subscription = await getSubscription(subscriptionId);
            
            // Update user subscription fields
            user.stripeCustomerId = session.customer;
            user.stripeSubscriptionId = subscriptionId;
            user.subscriptionStatus = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive';
            
            // Set subscription start date (when subscription was created) - only set once
            if (!user.subscriptionStartDate && subscription.created) {
              user.subscriptionStartDate = new Date(subscription.created * 1000);
              console.log(`[Stripe] Setting subscription start date to: ${user.subscriptionStartDate}`);
            }
            
            // Set period end date (convert Unix timestamp to Date)
            if (subscription.current_period_end) {
              user.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
              console.log(`[Stripe] Setting period end to: ${user.subscriptionCurrentPeriodEnd}`);
            }
            
            await user.save();
            console.log(`[Stripe] Updated subscription for user ${userId} via checkout session verification`);
            console.log(`[Stripe] Saved subscriptionStartDate: ${user.subscriptionStartDate}, subscriptionCurrentPeriodEnd: ${user.subscriptionCurrentPeriodEnd}`);
          }
        } catch (error) {
          console.error('[Stripe] Error updating subscription from checkout session:', error.message || error);
          console.error('[Stripe] Error stack:', error.stack);
          // Don't fail the request, just log the error - webhook will handle it
        }
      }

      // Generate JWT so the frontend can log the parent in immediately.
      token = generateToken(user._id);
    }

    // Refresh user data after potential update
    if (user) {
      user = await User.findById(userId).select('+stripeSubscriptionId +subscriptionStatus +subscriptionCurrentPeriodEnd +subscriptionStartDate +stripeCustomerId');
      // Remove password from response
      if (user && user.password) {
        user.password = undefined;
      }
    }

    return res.json({
      session: {
        id: session.id,
        status: session.status,
        mode: session.mode,
        payment_status: session.payment_status,
        customer: session.customer,
        subscription: session.subscription,
      },
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stripe/cancel-subscription
 *
 * Cancel the current user's subscription.
 * Sets cancel_at_period_end to true, so the subscription will cancel
 * at the end of the current billing period (respects yearly commitment).
 *
 * Requires authenticated parent user.
 */
exports.cancelUserSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get user with subscription fields
    const user = await User.findById(userId).select('+stripeSubscriptionId +subscriptionStatus +subscriptionCurrentPeriodEnd');

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (user.role !== 'parent') {
      return res.status(403).json({
        message: 'Only parents can cancel subscriptions.',
      });
    }

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({
        message: 'No active subscription found.',
      });
    }

    if (user.subscriptionStatus !== 'active') {
      return res.status(400).json({
        message: 'Subscription is not active.',
      });
    }

    // Check if subscription can be cancelled (must be at least 1 year old)
    const subscriptionStartDate = user.subscriptionStartDate || user.createdAt || new Date();
    const oneYearFromStart = new Date(subscriptionStartDate);
    oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
    
    const now = new Date();
    if (now < oneYearFromStart) {
      return res.status(400).json({
        message: 'Subscription cannot be cancelled until the one-year commitment period is complete.',
      });
    }

    // Cancel subscription via Stripe
    const subscription = await cancelSubscription(user.stripeSubscriptionId);

    // Update user subscription status
    // Note: We don't set status to 'canceled' yet - it will be canceled at period end
    // The webhook will handle the final status update when the period ends
    user.subscriptionStatus = 'active'; // Keep as active until period ends
    await user.save();

    return res.json({
      message: 'Subscription will be cancelled at the end of the current billing period.',
      subscription: {
        id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook handler for subscription events.
 * Handles:
 * - checkout.session.completed: Activate subscription when payment succeeds
 * - customer.subscription.updated: Update subscription status and period end
 * - customer.subscription.deleted: Mark subscription as canceled
 *
 * Requires Stripe webhook signature verification (handled by middleware).
 */
exports.handleWebhook = async (req, res, next) => {
  try {
    const event = req.stripeEvent;

    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe event found in request',
      });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (ID: ${event.id})`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Debug: Log FULL checkout session object
        console.log(`[Stripe Webhook] Full checkout.session.completed object:`, JSON.stringify(session, null, 2));
        
        // Only process subscription checkouts
        if (session.mode !== 'subscription') {
          console.log('[Stripe Webhook] Ignoring non-subscription checkout session');
          return res.json({ received: true });
        }

        const userId = session.metadata?.userId;
        if (!userId) {
          console.error('[Stripe Webhook] No userId in checkout session metadata');
          return res.status(400).json({
            success: false,
            message: 'Missing userId in session metadata',
          });
        }

        // Get user with subscription fields
        const user = await User.findById(userId).select('+stripeSubscriptionId +subscriptionStatus +subscriptionCurrentPeriodEnd +subscriptionStartDate +stripeCustomerId');
        
        if (!user) {
          console.error(`[Stripe Webhook] User not found: ${userId}`);
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        // Get subscription details from Stripe
        // session.subscription might be a string ID or an expanded object
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription?.id;

        if (!subscriptionId) {
          console.error('[Stripe Webhook] No subscription ID in checkout session');
          return res.status(400).json({
            success: false,
            message: 'Missing subscription ID in session',
          });
        }

        try {
          const subscription = await getSubscription(subscriptionId);

          // Debug: Log FULL subscription object to see all available fields
          console.log(`[Stripe Webhook] Full subscription object:`, JSON.stringify(subscription, null, 2));

          // Update user subscription fields
          user.stripeCustomerId = session.customer;
          user.stripeSubscriptionId = subscriptionId;
          user.subscriptionStatus = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive';
          
          // Set subscription start date (when subscription was created) - only set once
          if (!user.subscriptionStartDate && subscription.created) {
            user.subscriptionStartDate = new Date(subscription.created * 1000);
            console.log(`[Stripe Webhook] Setting subscription start date to: ${user.subscriptionStartDate}`);
          }
          
          // Set period end date (convert Unix timestamp to Date)
          if (subscription.current_period_end) {
            user.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
            console.log(`[Stripe Webhook] Setting period end to: ${user.subscriptionCurrentPeriodEnd}`);
          } else if (subscription.current_period_start) {
            // Fallback: Calculate period end from period start + billing interval
            // For monthly subscriptions, add 1 month
            const periodStart = new Date(subscription.current_period_start * 1000);
            const periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1); // Add 1 month for monthly billing
            user.subscriptionCurrentPeriodEnd = periodEnd;
            console.log(`[Stripe Webhook] Calculated period end from period start: ${user.subscriptionCurrentPeriodEnd}`);
          } else {
            console.warn(`[Stripe Webhook] No current_period_end or current_period_start in subscription. Will be set by customer.subscription.updated event.`);
          }

          await user.save();
          console.log(`[Stripe Webhook] Activated subscription for user ${userId} (subscription: ${subscriptionId})`);
          console.log(`[Stripe Webhook] Saved subscriptionStartDate: ${user.subscriptionStartDate}, subscriptionCurrentPeriodEnd: ${user.subscriptionCurrentPeriodEnd}`);

          return res.json({ received: true });
        } catch (error) {
          console.error('[Stripe Webhook] Error fetching subscription:', error.message);
          return res.status(500).json({
            success: false,
            message: `Failed to fetch subscription: ${error.message}`,
          });
        }
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Debug: Log FULL subscription object to see all available fields
        console.log(`[Stripe Webhook] Full subscription.updated object:`, JSON.stringify(subscription, null, 2));
        
        // Find user by subscription ID
        const user = await User.findOne({ stripeSubscriptionId: subscription.id })
          .select('+stripeSubscriptionId +subscriptionStatus +subscriptionCurrentPeriodEnd +subscriptionStartDate');

        if (!user) {
          console.warn(`[Stripe Webhook] User not found for subscription: ${subscription.id}`);
          return res.json({ received: true });
        }

        // Update subscription status
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          user.subscriptionStatus = 'active';
        } else if (subscription.status === 'past_due') {
          user.subscriptionStatus = 'past_due';
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          user.subscriptionStatus = 'canceled';
        }

        // Update subscription start date if not set (shouldn't happen, but safety check)
        if (!user.subscriptionStartDate && subscription.created) {
          user.subscriptionStartDate = new Date(subscription.created * 1000);
          console.log(`[Stripe Webhook] Set subscription start date: ${user.subscriptionStartDate}`);
        }

        // Update period end date (this should always be available in subscription.updated event)
        if (subscription.current_period_end) {
          user.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
          console.log(`[Stripe Webhook] Updated period end to: ${user.subscriptionCurrentPeriodEnd}`);
        } else if (subscription.current_period_start) {
          // Fallback: Calculate period end from period start + billing interval
          const periodStart = new Date(subscription.current_period_start * 1000);
          const periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1); // Add 1 month for monthly billing
          user.subscriptionCurrentPeriodEnd = periodEnd;
          console.log(`[Stripe Webhook] Calculated period end from period start: ${user.subscriptionCurrentPeriodEnd}`);
        } else {
          console.warn(`[Stripe Webhook] No period dates in subscription.updated event for ${subscription.id}`);
        }

        await user.save();
        console.log(`[Stripe Webhook] Updated subscription for user ${user._id} (status: ${user.subscriptionStatus})`);

        return res.json({ received: true });
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Find user by subscription ID
        const user = await User.findOne({ stripeSubscriptionId: subscription.id })
          .select('+stripeSubscriptionId +subscriptionStatus +subscriptionCurrentPeriodEnd +subscriptionStartDate');

        if (!user) {
          console.warn(`[Stripe Webhook] User not found for deleted subscription: ${subscription.id}`);
          return res.json({ received: true });
        }

        // Mark subscription as canceled
        user.subscriptionStatus = 'canceled';
        await user.save();
        console.log(`[Stripe Webhook] Marked subscription as canceled for user ${user._id}`);

        return res.json({ received: true });
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        // Debug: Log FULL invoice object to see all available fields
        console.log(`[Stripe Webhook] Full invoice object (${event.type}):`, JSON.stringify(invoice, null, 2));
        
        // Get subscription ID from invoice
        // It can be in invoice.subscription or invoice.parent.subscription_details.subscription
        let subscriptionId = null;
        if (invoice.subscription) {
          subscriptionId = typeof invoice.subscription === 'string' 
            ? invoice.subscription 
            : invoice.subscription.id;
        } else if (invoice.parent?.subscription_details?.subscription) {
          subscriptionId = typeof invoice.parent.subscription_details.subscription === 'string'
            ? invoice.parent.subscription_details.subscription
            : invoice.parent.subscription_details.subscription.id;
        }
        
        // Only process invoices for subscriptions
        if (!subscriptionId) {
          console.log('[Stripe Webhook] Invoice is not for a subscription, skipping');
          return res.json({ received: true });
        }

        // Find user by subscription ID
        const user = await User.findOne({ stripeSubscriptionId: subscriptionId })
          .select('+stripeSubscriptionId +subscriptionStatus +subscriptionCurrentPeriodEnd +subscriptionStartDate');

        if (!user) {
          console.warn(`[Stripe Webhook] User not found for invoice subscription: ${subscriptionId}`);
          return res.json({ received: true });
        }

        // Update period end date from invoice line item period.end (this is the actual subscription period end)
        // invoice.period_end is the invoice period, not the subscription period
        // The subscription period end is in lines.data[0].period.end
        const lineItem = invoice.lines?.data?.[0];
        if (lineItem?.period?.end) {
          user.subscriptionCurrentPeriodEnd = new Date(lineItem.period.end * 1000);
          console.log(`[Stripe Webhook] Updated period end from invoice line item: ${user.subscriptionCurrentPeriodEnd}`);
          await user.save();
        } else if (invoice.period_end) {
          // Fallback to invoice period_end if line item period is not available
          user.subscriptionCurrentPeriodEnd = new Date(invoice.period_end * 1000);
          console.log(`[Stripe Webhook] Updated period end from invoice period_end (fallback): ${user.subscriptionCurrentPeriodEnd}`);
          await user.save();
        } else {
          console.warn(`[Stripe Webhook] Invoice ${invoice.id} has no period end information`);
        }

        return res.json({ received: true });
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        return res.json({ received: true });
    }
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    next(error);
  }
};
