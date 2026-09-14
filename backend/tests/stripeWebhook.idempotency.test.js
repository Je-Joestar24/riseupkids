/**
 * Chunk 8 — Stripe webhook idempotency confirmation pass.
 *
 * Found while auditing controllers/stripe.controller.js#handleWebhook against the Chunk 8
 * checklist ("ensure StripeWebhookEvent is written ... concurrent duplicate delivery → one
 * activation"): the `acknowledge()` helper that records an event as processed was only ever
 * called from the Family Plan branch of `checkout.session.completed`. Every other event type
 * (legacy subscription checkout, customer.subscription.updated/deleted, invoice events, the
 * default case) returned `res.json({ received: true })` directly, bypassing `recordProcessedEvent`
 * entirely — a Stripe redelivery of any of those event types would have been reprocessed from
 * scratch every time instead of being caught by the `hasProcessedEvent()` check at the top of the
 * handler. Fixed by routing every success path through `acknowledge()`.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 8)
 */

jest.mock('../models/User');
jest.mock('../services/stripe.services');
jest.mock('../services/stripeWebhookIdempotency.service');

const User = require('../models/User');
const { getSubscription } = require('../services/stripe.services');
const { hasProcessedEvent, recordProcessedEvent } = require('../services/stripeWebhookIdempotency.service');
const { handleWebhook } = require('../controllers/stripe.controller');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

function mockUser(overrides = {}) {
  return {
    subscriptionStatus: 'inactive',
    subscriptionStartDate: null,
    subscriptionCurrentPeriodEnd: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  hasProcessedEvent.mockResolvedValue(false);
  recordProcessedEvent.mockResolvedValue(undefined);
});

it('an already-processed event id is acknowledged without touching User or recording again', async () => {
  hasProcessedEvent.mockResolvedValue(true);
  const req = { stripeEvent: { id: 'evt_dup', type: 'customer.subscription.updated', data: { object: {} } } };
  const res = mockRes();
  const next = jest.fn();

  await handleWebhook(req, res, next);

  expect(res.json).toHaveBeenCalledWith({ received: true });
  expect(recordProcessedEvent).not.toHaveBeenCalled();
  expect(User.findOne).not.toHaveBeenCalled();
});

describe('every handled event type records itself as processed (the fix)', () => {
  it('checkout.session.completed — Family Plan one-time payment', async () => {
    const user = mockUser();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const req = {
      stripeEvent: {
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            mode: 'payment',
            customer: 'cus_1',
            metadata: { userId: 'user-1', familyPlan: '1', childCount: '2', region: 'us' },
          },
        },
      },
    };
    const res = mockRes();
    await handleWebhook(req, res, jest.fn());

    expect(user.save).toHaveBeenCalled();
    expect(recordProcessedEvent).toHaveBeenCalledWith('evt_1', 'checkout.session.completed');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('checkout.session.completed — legacy subscription signup (previously NOT recorded)', async () => {
    const user = mockUser();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    getSubscription.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      created: 1700000000,
      current_period_end: 1730000000,
    });
    const req = {
      stripeEvent: {
        id: 'evt_2',
        type: 'checkout.session.completed',
        data: {
          object: { id: 'cs_2', mode: 'subscription', customer: 'cus_1', subscription: 'sub_1', metadata: { userId: 'user-1' } },
        },
      },
    };
    const res = mockRes();
    await handleWebhook(req, res, jest.fn());

    expect(user.save).toHaveBeenCalled();
    expect(recordProcessedEvent).toHaveBeenCalledWith('evt_2', 'checkout.session.completed');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('customer.subscription.updated (previously NOT recorded)', async () => {
    const user = mockUser();
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const req = {
      stripeEvent: {
        id: 'evt_3',
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_1', status: 'active', current_period_end: 1730000000 } },
      },
    };
    const res = mockRes();
    await handleWebhook(req, res, jest.fn());

    expect(user.save).toHaveBeenCalled();
    expect(recordProcessedEvent).toHaveBeenCalledWith('evt_3', 'customer.subscription.updated');
  });

  it('customer.subscription.deleted (previously NOT recorded)', async () => {
    const user = mockUser({ subscriptionStatus: 'active' });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const req = {
      stripeEvent: {
        id: 'evt_4',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_1' } },
      },
    };
    const res = mockRes();
    await handleWebhook(req, res, jest.fn());

    expect(user.subscriptionStatus).toBe('canceled');
    expect(recordProcessedEvent).toHaveBeenCalledWith('evt_4', 'customer.subscription.deleted');
  });

  it('invoice.payment_succeeded (previously NOT recorded)', async () => {
    const user = mockUser();
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const req = {
      stripeEvent: {
        id: 'evt_5',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_1',
            subscription: 'sub_1',
            lines: { data: [{ period: { end: 1730000000 } }] },
          },
        },
      },
    };
    const res = mockRes();
    await handleWebhook(req, res, jest.fn());

    expect(user.save).toHaveBeenCalled();
    expect(recordProcessedEvent).toHaveBeenCalledWith('evt_5', 'invoice.payment_succeeded');
  });

  it('an unhandled event type still records itself so it is not reprocessed forever', async () => {
    const req = {
      stripeEvent: { id: 'evt_6', type: 'payment_intent.created', data: { object: {} } },
    };
    const res = mockRes();
    await handleWebhook(req, res, jest.fn());

    expect(recordProcessedEvent).toHaveBeenCalledWith('evt_6', 'payment_intent.created');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});

describe('a redelivery of a previously-unrecorded event type is now deduplicated end to end', () => {
  it('customer.subscription.updated: second delivery of the same event id short-circuits', async () => {
    const user = mockUser();
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const event = {
      id: 'evt_redeliver',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'active', current_period_end: 1730000000 } },
    };

    // First delivery: not yet processed.
    hasProcessedEvent.mockResolvedValueOnce(false);
    await handleWebhook({ stripeEvent: event }, mockRes(), jest.fn());
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(recordProcessedEvent).toHaveBeenCalledWith('evt_redeliver', 'customer.subscription.updated');

    // Second delivery: idempotency service now reports it as processed.
    hasProcessedEvent.mockResolvedValueOnce(true);
    const res2 = mockRes();
    await handleWebhook({ stripeEvent: event }, res2, jest.fn());

    expect(user.save).toHaveBeenCalledTimes(1); // still just once — the old bug would make this 2
    expect(res2.json).toHaveBeenCalledWith({ received: true });
  });
});

describe('genuine failures are not recorded, so Stripe can retry them', () => {
  it('Family Plan checkout with no userId in metadata returns 400 without recording', async () => {
    const req = {
      stripeEvent: {
        id: 'evt_bad',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_bad', mode: 'payment', metadata: { familyPlan: '1' } } },
      },
    };
    const res = mockRes();
    await handleWebhook(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordProcessedEvent).not.toHaveBeenCalled();
  });
});
