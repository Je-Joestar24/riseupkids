/**
 * Chunk 8 — PayPal webhook (webhook hardening).
 *
 * Covers the two new pieces added for defense-in-depth (the client-driven capture-order flow
 * from paypalCapture.security.test.js never sees refunds/disputes, and might miss a capture
 * entirely if the client never calls back):
 *  1. middleware/paypalWebhook.js — fails closed on any missing header, missing config, or a
 *     non-SUCCESS verification result from PayPal's own verify-webhook-signature API.
 *  2. controllers/paypalWebhook.controller.js — idempotent by event id; self-heals a missed
 *     capture on PAYMENT.CAPTURE.COMPLETED; deactivates the subscription on a matching
 *     refund/reversal.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 8)
 */

jest.mock('axios');
jest.mock('../services/paypalService');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

const REQUIRED_HEADERS = {
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-cert-url': 'https://api.sandbox.paypal.com/cert',
  'paypal-transmission-id': 'txn-1',
  'paypal-transmission-sig': 'sig-1',
  'paypal-transmission-time': '2026-01-01T00:00:00Z',
};

describe('middleware/paypalWebhook — signature verification (fail closed)', () => {
  let origEnv;
  let paypalWebhook;
  let paypalService;
  let axios;

  // PAYPAL_API_BASE/PAYPAL_WEBHOOK_ID are read into module-level consts at require time, so the
  // middleware must be re-required (after resetModules) on every env change. That in turn means
  // its internal `require('axios')` returns a brand-new automock instance each time — re-require
  // axios here too so the reference this file configures is the SAME one the middleware calls.
  beforeEach(() => {
    origEnv = { ...process.env };
    process.env.PAYPAL_API_BASE = 'https://api.sandbox.paypal.com';
    process.env.PAYPAL_WEBHOOK_ID = 'WH-CONFIGURED-ID';
    jest.resetModules();
    axios = require('axios');
    paypalService = require('../services/paypalService');
    paypalService.getAccessToken = jest.fn().mockResolvedValue('access-token-1');
    paypalWebhook = require('../middleware/paypalWebhook');
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('rejects with 400 when a required transmission header is missing, before any network call', async () => {
    const req = { headers: { ...REQUIRED_HEADERS }, body: { id: 'WH-EVT-1' } };
    delete req.headers['paypal-transmission-sig'];
    const res = mockRes();
    const next = jest.fn();

    await paypalWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects with 500 when PAYPAL_WEBHOOK_ID is not configured, before any network call', async () => {
    jest.resetModules();
    delete process.env.PAYPAL_WEBHOOK_ID;
    axios = require('axios');
    paypalService = require('../services/paypalService');
    paypalService.getAccessToken = jest.fn().mockResolvedValue('access-token-1');
    paypalWebhook = require('../middleware/paypalWebhook');

    const req = { headers: { ...REQUIRED_HEADERS }, body: { id: 'WH-EVT-1' } };
    const res = mockRes();
    const next = jest.fn();

    await paypalWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects with 400 when PayPal reports verification_status !== SUCCESS', async () => {
    axios.post.mockResolvedValue({ data: { verification_status: 'FAILURE' } });
    const req = { headers: { ...REQUIRED_HEADERS }, body: { id: 'WH-EVT-1' } };
    const res = mockRes();
    const next = jest.fn();

    await paypalWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 400 when the verification request itself errors (network/timeout)', async () => {
    axios.post.mockRejectedValue(new Error('timeout'));
    const req = { headers: { ...REQUIRED_HEADERS }, body: { id: 'WH-EVT-1' } };
    const res = mockRes();
    const next = jest.fn();

    await paypalWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and attaches req.paypalWebhookEvent when verification succeeds', async () => {
    axios.post.mockResolvedValue({ data: { verification_status: 'SUCCESS' } });
    const body = { id: 'WH-EVT-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' };
    const req = { headers: { ...REQUIRED_HEADERS }, body };
    const res = mockRes();
    const next = jest.fn();

    await paypalWebhook(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.paypalWebhookEvent).toBe(body);
    expect(res.status).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
      expect.objectContaining({ webhook_id: 'WH-CONFIGURED-ID', webhook_event: body }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token-1' }) })
    );
  });
});

describe('controllers/paypalWebhook.controller — idempotency and event handling', () => {
  jest.doMock('../services/paypalWebhookIdempotency.service');
  jest.doMock('../services/paypalActivation.service');

  const { hasProcessedEvent, recordProcessedEvent } = require('../services/paypalWebhookIdempotency.service');
  const { activateFromPaypalCapture, deactivateFromPaypalReversal } = require('../services/paypalActivation.service');
  const { handleWebhook } = require('../controllers/paypalWebhook.controller');

  beforeEach(() => {
    jest.clearAllMocks();
    hasProcessedEvent.mockResolvedValue(false);
    recordProcessedEvent.mockResolvedValue(undefined);
    activateFromPaypalCapture.mockResolvedValue({ applied: true, alreadyApplied: false });
    deactivateFromPaypalReversal.mockResolvedValue({ deactivated: true });
  });

  it('rejects with 400 when no verified event is attached to the request', async () => {
    const req = {};
    const res = mockRes();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(hasProcessedEvent).not.toHaveBeenCalled();
  });

  it('acknowledges without reprocessing when the event id was already recorded', async () => {
    hasProcessedEvent.mockResolvedValue(true);
    const req = {
      paypalWebhookEvent: { id: 'WH-EVT-DUP', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(activateFromPaypalCapture).not.toHaveBeenCalled();
    expect(recordProcessedEvent).not.toHaveBeenCalled();
  });

  it('PAYMENT.CAPTURE.COMPLETED activates the subscription using userId/tier parsed from custom_id', async () => {
    const req = {
      paypalWebhookEvent: {
        id: 'WH-EVT-1',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP-1',
          custom_id: 'user-42|1_child_USD',
          payer: { payer_id: 'PAYER-1' },
        },
      },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(activateFromPaypalCapture).toHaveBeenCalledWith({
      userId: 'user-42',
      payerId: 'PAYER-1',
      captureId: 'CAP-1',
      tier: '1_child_USD',
    });
    expect(recordProcessedEvent).toHaveBeenCalledWith('WH-EVT-1', 'PAYMENT.CAPTURE.COMPLETED');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('PAYMENT.CAPTURE.COMPLETED with an unparseable custom_id acknowledges without calling activation', async () => {
    const req = {
      paypalWebhookEvent: {
        id: 'WH-EVT-2',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAP-1', custom_id: 'not-pipe-separated' },
      },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(activateFromPaypalCapture).not.toHaveBeenCalled();
    expect(recordProcessedEvent).toHaveBeenCalledWith('WH-EVT-2', 'PAYMENT.CAPTURE.COMPLETED');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('a self-heal error during PAYMENT.CAPTURE.COMPLETED does not fail the webhook response', async () => {
    activateFromPaypalCapture.mockRejectedValue(new Error('User not found'));
    const req = {
      paypalWebhookEvent: {
        id: 'WH-EVT-3',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAP-1', custom_id: 'user-42|1_child_USD' },
      },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(recordProcessedEvent).toHaveBeenCalledWith('WH-EVT-3', 'PAYMENT.CAPTURE.COMPLETED');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('PAYMENT.CAPTURE.REFUNDED extracts the original capture id from the "up" link and deactivates', async () => {
    const req = {
      paypalWebhookEvent: {
        id: 'WH-EVT-4',
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        resource: {
          id: 'REFUND-1',
          links: [
            { rel: 'self', href: 'https://api.sandbox.paypal.com/v2/payments/refunds/REFUND-1' },
            { rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/CAP-1' },
          ],
        },
      },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(deactivateFromPaypalReversal).toHaveBeenCalledWith({ captureId: 'CAP-1' });
    expect(recordProcessedEvent).toHaveBeenCalledWith('WH-EVT-4', 'PAYMENT.CAPTURE.REFUNDED');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('PAYMENT.CAPTURE.REVERSED falls back to resource.id when there is no "up" link', async () => {
    const req = {
      paypalWebhookEvent: {
        id: 'WH-EVT-5',
        event_type: 'PAYMENT.CAPTURE.REVERSED',
        resource: { id: 'CAP-1', status: 'DECLINED' },
      },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(deactivateFromPaypalReversal).toHaveBeenCalledWith({ captureId: 'CAP-1' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('an unhandled event type is acknowledged and recorded without touching any subscription', async () => {
    const req = {
      paypalWebhookEvent: { id: 'WH-EVT-6', event_type: 'CHECKOUT.ORDER.APPROVED', resource: {} },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(activateFromPaypalCapture).not.toHaveBeenCalled();
    expect(deactivateFromPaypalReversal).not.toHaveBeenCalled();
    expect(recordProcessedEvent).toHaveBeenCalledWith('WH-EVT-6', 'CHECKOUT.ORDER.APPROVED');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 without acknowledging when idempotency lookup itself throws', async () => {
    hasProcessedEvent.mockRejectedValue(new Error('Mongo down'));
    const req = {
      paypalWebhookEvent: { id: 'WH-EVT-7', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} },
    };
    const res = mockRes();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(recordProcessedEvent).not.toHaveBeenCalled();
  });
});
