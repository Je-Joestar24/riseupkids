/**
 * Chunk 8 — PayPal capture hardening.
 *
 * Covers the two real gaps found in this chunk:
 *  1. Idempotency: capturing an already-completed order used to unconditionally extend the
 *     subscription by another year on every call — a resent/retried request granted a free
 *     extension indefinitely. Fixed in controllers/paypal.controller.js.
 *  2. Amount verification: services/paypalService.js now confirms what PayPal actually captured
 *     matches the price on file for the order's own tier before treating it as valid.
 *
 * The owner check (order's custom_id userId must match the caller) already existed and is
 * exercised here too for completeness.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 8)
 */
jest.mock('../services/paypalService');
jest.mock('../models/User');

const paypalService = require('../services/paypalService');
const User = require('../models/User');
const { captureOrder } = require('../controllers/paypal.controller');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

function mockUser(overrides = {}) {
  return {
    paypalPayerId: null,
    paypalCaptureId: null,
    subscriptionStatus: 'inactive',
    subscriptionStartDate: null,
    subscriptionCurrentPeriodEnd: null,
    planKidsLimit: null,
    planRegion: null,
    paymentProvider: null,
    subscriptionPlan: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('PayPal capture — idempotency (no free re-extension)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    paypalService.parseTier.mockReturnValue({ tierKey: '1_child', currency: 'USD' });
    paypalService.tierKeyToPlanKidsLimit.mockReturnValue(1);
    paypalService.currencyToPlanRegion.mockReturnValue('us');
  });

  it('a first-time capture extends the subscription and records the capture id', async () => {
    const user = mockUser();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    paypalService.capturePaypalOrder.mockResolvedValue({
      payerId: 'PAYER-1',
      captureId: 'CAP-1',
      tier: '1_child_USD',
      alreadyCaptured: false,
    });

    const req = { user: { _id: 'user-1' }, body: { orderID: 'ORDER-1' } };
    const res = mockRes();
    await captureOrder(req, res);

    expect(user.save).toHaveBeenCalled();
    expect(user.paypalCaptureId).toBe('CAP-1');
    expect(user.subscriptionCurrentPeriodEnd).toBeInstanceOf(Date);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('re-capturing the SAME order after it was already applied to this user does not extend it again', async () => {
    const originalPeriodEnd = new Date('2027-01-01T00:00:00Z');
    const user = mockUser({
      paypalCaptureId: 'CAP-1', // already recorded from a prior successful capture
      subscriptionCurrentPeriodEnd: originalPeriodEnd,
      subscriptionStatus: 'active',
    });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    paypalService.capturePaypalOrder.mockResolvedValue({
      payerId: 'PAYER-1',
      captureId: 'CAP-1', // same capture id as before
      tier: '1_child_USD',
      alreadyCaptured: true,
    });

    const req = { user: { _id: 'user-1' }, body: { orderID: 'ORDER-1' } };
    const res = mockRes();
    await captureOrder(req, res);

    // The old bug: this would have unconditionally set a new +1-year period end and saved.
    expect(user.save).not.toHaveBeenCalled();
    expect(user.subscriptionCurrentPeriodEnd).toBe(originalPeriodEnd);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: expect.stringMatching(/unchanged/i) })
    );
  });

  it('repeated capture calls in a row only ever extend the subscription once', async () => {
    const user = mockUser();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const req = { user: { _id: 'user-1' }, body: { orderID: 'ORDER-1' } };

    // Call 1: fresh capture.
    paypalService.capturePaypalOrder.mockResolvedValueOnce({
      payerId: 'PAYER-1',
      captureId: 'CAP-1',
      tier: '1_child_USD',
      alreadyCaptured: false,
    });
    await captureOrder(req, mockRes());
    const periodEndAfterFirstCall = user.subscriptionCurrentPeriodEnd;
    expect(user.save).toHaveBeenCalledTimes(1);

    // Call 2, 3: PayPal/the client retries with the same orderID; PayPal now reports COMPLETED.
    for (let i = 0; i < 2; i += 1) {
      paypalService.capturePaypalOrder.mockResolvedValueOnce({
        payerId: 'PAYER-1',
        captureId: 'CAP-1',
        tier: '1_child_USD',
        alreadyCaptured: true,
      });
      await captureOrder(req, mockRes());
    }

    expect(user.save).toHaveBeenCalledTimes(1); // still just the one save from call 1
    expect(user.subscriptionCurrentPeriodEnd).toBe(periodEndAfterFirstCall); // never moved again
  });

  it('if alreadyCaptured is true but this user never had it recorded, applies entitlement once (self-heals a failed prior save)', async () => {
    const user = mockUser({ paypalCaptureId: null }); // DB write from a previous attempt never landed
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    paypalService.capturePaypalOrder.mockResolvedValue({
      payerId: 'PAYER-1',
      captureId: 'CAP-1',
      tier: '1_child_USD',
      alreadyCaptured: true,
    });

    const req = { user: { _id: 'user-1' }, body: { orderID: 'ORDER-1' } };
    const res = mockRes();
    await captureOrder(req, res);

    expect(user.save).toHaveBeenCalled();
    expect(user.paypalCaptureId).toBe('CAP-1');
    expect(user.subscriptionCurrentPeriodEnd).toBeInstanceOf(Date);
  });
});

describe('PayPal capture — errors from the service (owner mismatch, amount mismatch) surface as a clean failure', () => {
  it('an owner-mismatch error from the service blocks the capture with no entitlement change', async () => {
    paypalService.capturePaypalOrder.mockRejectedValue(new Error('Order does not belong to this user'));
    const req = { user: { _id: 'user-1' }, body: { orderID: 'ORDER-1' } };
    const res = mockRes();

    await captureOrder(req, res);

    expect(User.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('an amount-mismatch error from the service blocks the capture with no entitlement change', async () => {
    paypalService.capturePaypalOrder.mockRejectedValue(
      new Error('Captured amount mismatch: expected 151.00 USD, got 1.00 USD')
    );
    const req = { user: { _id: 'user-1' }, body: { orderID: 'ORDER-1' } };
    const res = mockRes();

    await captureOrder(req, res);

    expect(User.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
