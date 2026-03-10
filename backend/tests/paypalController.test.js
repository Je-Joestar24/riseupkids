/**
 * Unit tests for PayPal controller
 *
 * Mocks: paypalService, User model.
 * Tests HTTP status codes, response bodies, validation, and auth handling.
 */

jest.mock('../services/paypalService');
jest.mock('../models/User');

const paypalService = require('../services/paypalService');
const User = require('../models/User');
const { createOrder, captureOrder } = require('../controllers/paypal.controller');

describe('paypal.controller', () => {
  let req;
  let res;

  function mockResWithStatusChain() {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return res;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore?.();
    console.log.mockRestore?.();
  });

  describe('createOrder', () => {
    beforeEach(() => {
      paypalService.getValidTiers.mockReturnValue(['1_child_USD', '2_children_BRL', '2_children_yearly_BRL']);
    });

    it('returns 401 when req.user is missing', async () => {
      req = { user: null, body: { tier: '1_child_USD' } };
      res = mockResWithStatusChain();

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.',
      });
      expect(paypalService.createPaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 401 when req.user._id is missing', async () => {
      req = { user: {}, body: { tier: '1_child_USD' } };
      res = mockResWithStatusChain();

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.',
      });
      expect(paypalService.createPaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when tier is missing', async () => {
      req = { user: { _id: 'user-123' }, body: {} };
      res = mockResWithStatusChain();

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringMatching(/Provide either tier or|Invalid tier/),
      });
      expect(paypalService.createPaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when tier is not in valid list', async () => {
      req = { user: { _id: 'user-123' }, body: { tier: '1_child_GBP' } };
      res = mockResWithStatusChain();

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Invalid tier'),
      });
      expect(paypalService.createPaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 201 and orderID when tier is valid', async () => {
      req = { user: { _id: 'user-123' }, body: { tier: '1_child_USD' } };
      res = mockResWithStatusChain();
      paypalService.createPaypalOrder.mockResolvedValue({ orderID: 'ORDER-ABC' });

      await createOrder(req, res);

      expect(paypalService.createPaypalOrder).toHaveBeenCalledWith('1_child_USD', 'user-123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        orderID: 'ORDER-ABC',
      });
    });

    it('normalizes tier case and passes canonical tier to service', async () => {
      req = { user: { _id: 'user-456' }, body: { tier: '  1_CHILD_USD  ' } };
      res = mockResWithStatusChain();
      paypalService.getValidTiers.mockReturnValue(['1_child_USD', '2_children_BRL']);
      paypalService.createPaypalOrder.mockResolvedValue({ orderID: 'ORDER-XYZ' });

      await createOrder(req, res);

      expect(paypalService.createPaypalOrder).toHaveBeenCalledWith('1_child_USD', 'user-456');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, orderID: 'ORDER-XYZ' });
    });

    it('returns 500 when createPaypalOrder throws', async () => {
      req = { user: { _id: 'user-123' }, body: { tier: '1_child_USD' } };
      res = mockResWithStatusChain();
      paypalService.createPaypalOrder.mockRejectedValue(new Error('PayPal API error'));

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'PayPal API error',
      });
    });

    it('returns 201 with orderID when tier is a valid yearly tier (option A)', async () => {
      req = { user: { _id: 'user-123' }, body: { tier: '2_children_yearly_BRL' } };
      res = mockResWithStatusChain();
      paypalService.createPaypalOrder.mockResolvedValue({ orderID: 'ORDER-YEARLY' });

      await createOrder(req, res);

      expect(paypalService.createPaypalOrder).toHaveBeenCalledWith('2_children_yearly_BRL', 'user-123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        orderID: 'ORDER-YEARLY',
      });
    });

    it('returns 201 with orderID when using planType option B (yearly)', async () => {
      req = {
        user: { _id: 'user-456' },
        body: { childCount: 2, currency: 'BRL', planType: 'yearly' },
      };
      res = mockResWithStatusChain();
      paypalService.getValidPlanTypes.mockReturnValue(['yearly', 'pay_in_4']);
      paypalService.buildTier.mockReturnValue('2_children_yearly_BRL');
      paypalService.createPaypalOrder.mockResolvedValue({ orderID: 'ORDER-OPT-B' });

      await createOrder(req, res);

      expect(paypalService.buildTier).toHaveBeenCalledWith(2, 'BRL', 'yearly');
      expect(paypalService.createPaypalOrder).toHaveBeenCalledWith('2_children_yearly_BRL', 'user-456');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, orderID: 'ORDER-OPT-B' });
    });

    it('returns 201 with orderID when using planType option B (pay_in_4)', async () => {
      req = {
        user: { _id: 'user-789' },
        body: { childCount: 1, currency: 'USD', planType: 'pay_in_4' },
      };
      res = mockResWithStatusChain();
      paypalService.getValidPlanTypes.mockReturnValue(['yearly', 'pay_in_4']);
      paypalService.buildTier.mockReturnValue('1_child_USD');
      paypalService.createPaypalOrder.mockResolvedValue({ orderID: 'ORDER-P4' });

      await createOrder(req, res);

      expect(paypalService.buildTier).toHaveBeenCalledWith(1, 'USD', 'pay_in_4');
      expect(paypalService.createPaypalOrder).toHaveBeenCalledWith('1_child_USD', 'user-789');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, orderID: 'ORDER-P4' });
    });

    it('returns 400 when planType is invalid (option B)', async () => {
      req = {
        user: { _id: 'user-123' },
        body: { childCount: 1, currency: 'USD', planType: 'monthly' },
      };
      res = mockResWithStatusChain();
      paypalService.getValidPlanTypes.mockReturnValue(['yearly', 'pay_in_4']);

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Invalid planType'),
      });
      expect(paypalService.buildTier).not.toHaveBeenCalled();
      expect(paypalService.createPaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when option B has missing childCount, currency, or planType', async () => {
      req = { user: { _id: 'user-123' }, body: { currency: 'USD', planType: 'yearly' } };
      res = mockResWithStatusChain();

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].message).toMatch(/Provide either tier|childCount|planType/);
      expect(paypalService.createPaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when buildTier throws (e.g. invalid currency)', async () => {
      req = {
        user: { _id: 'user-123' },
        body: { childCount: 1, currency: 'GBP', planType: 'yearly' },
      };
      res = mockResWithStatusChain();
      paypalService.getValidPlanTypes.mockReturnValue(['yearly', 'pay_in_4']);
      paypalService.buildTier.mockImplementation(() => {
        throw new Error('Invalid tier built: 1_child_yearly_GBP.');
      });

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringMatching(/Invalid tier built|Invalid childCount or currency/),
      });
      expect(paypalService.createPaypalOrder).not.toHaveBeenCalled();
    });
  });

  describe('captureOrder', () => {
    it('returns 401 when req.user is missing', async () => {
      req = { user: null, body: { orderID: 'ORDER-123' } };
      res = mockResWithStatusChain();

      await captureOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.',
      });
      expect(paypalService.capturePaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when orderID is missing', async () => {
      req = { user: { _id: 'user-123' }, body: {} };
      res = mockResWithStatusChain();

      await captureOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'orderID is required.',
      });
      expect(paypalService.capturePaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when orderID is not a string', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: 12345 } };
      res = mockResWithStatusChain();

      await captureOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'orderID is required.',
      });
      expect(paypalService.capturePaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when orderID is empty string', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: '   ' } };
      res = mockResWithStatusChain();

      await captureOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'orderID is required.',
      });
      expect(paypalService.capturePaypalOrder).not.toHaveBeenCalled();
    });

    it('returns 404 when User.findById returns null', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: 'ORDER-123' } };
      res = mockResWithStatusChain();
      paypalService.capturePaypalOrder.mockResolvedValue({
        payerId: 'PAYER-1',
        captureId: 'CAP-1',
        tier: '1_child_USD',
        alreadyCaptured: false,
      });
      paypalService.parseTier.mockReturnValue({ tierKey: '1_child', currency: 'USD' });
      paypalService.tierKeyToPlanKidsLimit.mockReturnValue(1);
      paypalService.currencyToPlanRegion.mockReturnValue('us');
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await captureOrder(req, res);

      expect(paypalService.capturePaypalOrder).toHaveBeenCalledWith('ORDER-123', 'user-123');
      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found.',
      });
    });

    it('returns 200 and updates user when capture succeeds', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: 'ORDER-123' } };
      res = mockResWithStatusChain();
      paypalService.capturePaypalOrder.mockResolvedValue({
        payerId: 'PAYER-123',
        captureId: 'CAP-456',
        tier: '1_child_USD',
        alreadyCaptured: false,
      });
      paypalService.parseTier.mockReturnValue({ tierKey: '1_child', currency: 'USD' });
      paypalService.tierKeyToPlanKidsLimit.mockReturnValue(1);
      paypalService.currencyToPlanRegion.mockReturnValue('us');

      const mockUser = {
        paypalPayerId: null,
        paypalCaptureId: null,
        subscriptionStatus: null,
        subscriptionStartDate: null,
        subscriptionCurrentPeriodEnd: null,
        planKidsLimit: null,
        planRegion: null,
        paymentProvider: null,
        subscriptionPlan: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await captureOrder(req, res);

      expect(paypalService.capturePaypalOrder).toHaveBeenCalledWith('ORDER-123', 'user-123');
      expect(paypalService.parseTier).toHaveBeenCalledWith('1_child_USD');
      expect(paypalService.tierKeyToPlanKidsLimit).toHaveBeenCalledWith('1_child');
      expect(paypalService.currencyToPlanRegion).toHaveBeenCalledWith('USD');

      expect(mockUser.paypalPayerId).toBe('PAYER-123');
      expect(mockUser.paypalCaptureId).toBe('CAP-456');
      expect(mockUser.subscriptionStatus).toBe('active');
      expect(mockUser.planKidsLimit).toBe(1);
      expect(mockUser.planRegion).toBe('us');
      expect(mockUser.paymentProvider).toBe('paypal');
      expect(mockUser.subscriptionPlan).toBe('yearly');
      expect(mockUser.subscriptionCurrentPeriodEnd).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order captured and subscription activated.',
      });
    });

    it('returns message for alreadyCaptured when order was already captured', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: 'ORDER-123' } };
      res = mockResWithStatusChain();
      paypalService.capturePaypalOrder.mockResolvedValue({
        payerId: 'PAYER-OLD',
        captureId: 'CAP-OLD',
        tier: '2_children_BRL',
        alreadyCaptured: true,
      });
      paypalService.parseTier.mockReturnValue({ tierKey: '2_children', currency: 'BRL' });
      paypalService.tierKeyToPlanKidsLimit.mockReturnValue(2);
      paypalService.currencyToPlanRegion.mockReturnValue('br');

      const mockUser = {
        paypalPayerId: null,
        paypalCaptureId: null,
        subscriptionStatus: null,
        subscriptionStartDate: null,
        subscriptionCurrentPeriodEnd: null,
        planKidsLimit: null,
        planRegion: null,
        paymentProvider: null,
        subscriptionPlan: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await captureOrder(req, res);

      expect(mockUser.planKidsLimit).toBe(2);
      expect(mockUser.planRegion).toBe('br');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order was already captured; subscription updated.',
      });
    });

    it('updates user correctly when capture has yearly tier', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: 'ORDER-123' } };
      res = mockResWithStatusChain();
      paypalService.capturePaypalOrder.mockResolvedValue({
        payerId: 'PAYER-Y',
        captureId: 'CAP-Y',
        tier: '3_children_yearly_EUR',
        alreadyCaptured: false,
      });
      paypalService.parseTier.mockReturnValue({ tierKey: '3_children_yearly', currency: 'EUR' });
      paypalService.tierKeyToPlanKidsLimit.mockReturnValue(3);
      paypalService.currencyToPlanRegion.mockReturnValue('eu');

      const mockUser = {
        paypalPayerId: null,
        paypalCaptureId: null,
        subscriptionStatus: null,
        subscriptionStartDate: null,
        subscriptionCurrentPeriodEnd: null,
        planKidsLimit: null,
        planRegion: null,
        paymentProvider: null,
        subscriptionPlan: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await captureOrder(req, res);

      expect(paypalService.parseTier).toHaveBeenCalledWith('3_children_yearly_EUR');
      expect(paypalService.tierKeyToPlanKidsLimit).toHaveBeenCalledWith('3_children_yearly');
      expect(mockUser.planKidsLimit).toBe(3);
      expect(mockUser.planRegion).toBe('eu');
      expect(mockUser.paymentProvider).toBe('paypal');
      expect(mockUser.subscriptionPlan).toBe('yearly');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('trims orderID before calling service', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: '  ORDER-123  ' } };
      res = mockResWithStatusChain();
      paypalService.capturePaypalOrder.mockResolvedValue({
        payerId: 'P',
        captureId: 'C',
        tier: '1_child_USD',
        alreadyCaptured: false,
      });
      paypalService.parseTier.mockReturnValue({ tierKey: '1_child', currency: 'USD' });
      paypalService.tierKeyToPlanKidsLimit.mockReturnValue(1);
      paypalService.currencyToPlanRegion.mockReturnValue('us');
      const mockUser = {
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await captureOrder(req, res);

      expect(paypalService.capturePaypalOrder).toHaveBeenCalledWith('ORDER-123', 'user-123');
    });

    it('returns 500 when capturePaypalOrder throws', async () => {
      req = { user: { _id: 'user-123' }, body: { orderID: 'ORDER-123' } };
      res = mockResWithStatusChain();
      paypalService.capturePaypalOrder.mockRejectedValue(new Error('Order does not belong to this user'));

      await captureOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Order does not belong to this user',
      });
    });
  });
});
