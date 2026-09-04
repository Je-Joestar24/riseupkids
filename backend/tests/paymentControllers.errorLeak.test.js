/**
 * RUK-SEC-011 follow-up — PayPal / PagBank controllers must not return raw third-party API error
 * detail to the browser in production. Both controllers previously returned `error.message`
 * straight through, which for these services includes the HTTP status, provider debug id, and
 * the full raw response body from PayPal/PagBank.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-011
 */
const NODE_ENV = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = NODE_ENV;
  jest.resetModules();
});

function mockRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res;
}

describe('paypal.controller — production error responses are generic', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => console.error.mockRestore?.());

  const LEAKY = new Error(
    'PayPal createPaypalOrder failed: HTTP 400 | PayPal-Debug-Id: xyz | {"details":[{"issue":"INVALID_RESOURCE_ID"}]}'
  );

  it('createOrder: production hides the PayPal API detail behind a generic message', async () => {
    process.env.NODE_ENV = 'production';
    jest.doMock('../services/paypalService', () => ({
      getValidTiers: () => ['1_child_USD'],
      createPaypalOrder: jest.fn().mockRejectedValue(LEAKY),
    }));
    jest.doMock('../models/User', () => ({}));
    const { createOrder } = require('../controllers/paypal.controller');

    const res = mockRes();
    await createOrder({ user: { _id: 'u1' }, body: { tier: '1_child_USD' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ success: false, message: 'Failed to create PayPal order.' });
    expect(JSON.stringify(body)).not.toMatch(/PayPal-Debug-Id|INVALID_RESOURCE_ID|HTTP 400/);
  });

  it('captureOrder: production hides the PayPal API detail behind a generic message', async () => {
    process.env.NODE_ENV = 'production';
    jest.doMock('../services/paypalService', () => ({
      capturePaypalOrder: jest.fn().mockRejectedValue(
        new Error('PayPal capture failed: HTTP 422 | {"name":"UNPROCESSABLE_ENTITY"}')
      ),
    }));
    jest.doMock('../models/User', () => ({}));
    const { captureOrder } = require('../controllers/paypal.controller');

    const res = mockRes();
    await captureOrder({ user: { _id: 'u1' }, body: { orderID: 'ORDER-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ success: false, message: 'Failed to capture PayPal order.' });
    expect(JSON.stringify(body)).not.toMatch(/UNPROCESSABLE_ENTITY|HTTP 422/);
  });

  it('development still shows the real message (useful while building against the sandbox)', async () => {
    process.env.NODE_ENV = 'development';
    jest.doMock('../services/paypalService', () => ({
      getValidTiers: () => ['1_child_USD'],
      createPaypalOrder: jest.fn().mockRejectedValue(LEAKY),
    }));
    jest.doMock('../models/User', () => ({}));
    const { createOrder } = require('../controllers/paypal.controller');

    const res = mockRes();
    await createOrder({ user: { _id: 'u1' }, body: { tier: '1_child_USD' } }, res);

    expect(res.json.mock.calls[0][0].message).toBe(LEAKY.message);
  });
});

describe('pagseguro.controller getCheckoutDetails — production error responses are generic', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => console.error.mockRestore?.());

  function setUpMocks({ getPagbankCheckoutImpl }) {
    jest.doMock('../models/User', () => ({
      findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }),
    }));
    jest.doMock('../models/PagSeguroCheckout', () => ({
      findOne: jest.fn().mockResolvedValue({
        pagbankCheckoutId: 'CHEC_1',
        status: 'pending',
        paidAt: null,
        chargeIds: [],
        webhookEvents: [],
        userId: 'u1',
        save: jest.fn(),
      }),
    }));
    jest.doMock('../services/auth.services', () => ({ generateToken: jest.fn() }));
    jest.doMock('../services/pagseguro.service', () => ({
      getPagseguroConfig: jest.fn(),
      createPagbankCheckout: jest.fn(),
      buildCheckoutLineItems: jest.fn(),
      generateReferenceId: jest.fn(),
      isPagseguroConfigured: () => true,
      getPagbankCheckout: getPagbankCheckoutImpl,
      resolveCheckoutPaymentStatus: jest.fn(),
    }));
    jest.doMock('../services/pagseguroWebhook.service', () => ({ processWebhookNotification: jest.fn() }));
    jest.doMock('../services/pagseguroActivation.service', () => ({ activateUserFromPagseguroCheckout: jest.fn() }));
    jest.doMock('../services/pagseguroDiagnostics.service', () => ({ buildVerificationDiagnostics: jest.fn() }));
  }

  const LEAKY = new Error(
    'PagBank getCheckout failed: HTTP 500 | {"error_messages":[{"code":"40001","description":"Internal error, please contact PagBank support."}]}'
  );

  it('production: a PagBank API failure is hidden behind a generic message', async () => {
    process.env.NODE_ENV = 'production';
    const err = Object.assign(new Error(LEAKY.message), { statusCode: 502 });
    setUpMocks({ getPagbankCheckoutImpl: jest.fn().mockRejectedValue(err) });
    const { getCheckoutDetails } = require('../controllers/pagseguro.controller');

    const req = { params: { checkoutId: 'CHEC_1' }, ip: '203.0.113.1', headers: {} };
    const res = mockRes();
    const next = jest.fn();
    await getCheckoutDetails(req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ success: false, message: 'Unable to verify checkout with PagBank.' });
    expect(JSON.stringify(body)).not.toMatch(/40001|error_messages|HTTP 500/);
    expect(next).not.toHaveBeenCalled();
  });

  it('production: a 404 from PagBank still maps to a clean "not found" message', async () => {
    process.env.NODE_ENV = 'production';
    const err = Object.assign(new Error('Checkout not found.'), { statusCode: 404 });
    setUpMocks({ getPagbankCheckoutImpl: jest.fn().mockRejectedValue(err) });
    const { getCheckoutDetails } = require('../controllers/pagseguro.controller');

    const req = { params: { checkoutId: 'CHEC_1' }, ip: '203.0.113.1', headers: {} };
    const res = mockRes();
    await getCheckoutDetails(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0]).toEqual({ success: false, message: 'Checkout session not found.' });
  });

  it('development: still shows the real PagBank error detail', async () => {
    process.env.NODE_ENV = 'development';
    const err = Object.assign(new Error(LEAKY.message), { statusCode: 502 });
    setUpMocks({ getPagbankCheckoutImpl: jest.fn().mockRejectedValue(err) });
    const { getCheckoutDetails } = require('../controllers/pagseguro.controller');

    const req = { params: { checkoutId: 'CHEC_1' }, ip: '203.0.113.1', headers: {} };
    const res = mockRes();
    await getCheckoutDetails(req, res, jest.fn());

    expect(res.json.mock.calls[0][0].message).toBe(LEAKY.message);
  });
});
