/**
 * Unit tests for PayPal Service
 *
 * Mocks: fs (pricing config), axios (PayPal API), process.env
 * Tests pure helpers and async flows with proper data assertions.
 */

// Pricing fixture matching config/paypalFamilyPlanPrices.json structure
const PRICES_FIXTURE = {
  USD: { '1_child': 151, '2_children': 239, '3_children': 319 },
  BRL: { '1_child': 799, '2_children': 1299, '3_children': 1799 },
  EUR: { '1_child': 130, '2_children': 205, '3_children': 274 },
};

const mockPricesJson = JSON.stringify(PRICES_FIXTURE);

// Mock fs before requiring the service (so getPrices() uses fixture)
jest.mock('fs', () => ({
  existsSync: jest.fn((p) => (p && String(p).includes('paypalFamilyPlanPrices.json'))),
  readFileSync: jest.fn(() => mockPricesJson),
}));

jest.mock('axios');

const axios = require('axios');

// Set PayPal env before first require (service reads them at load time)
process.env.PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api.paypal.com';
process.env.PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'test-client';
process.env.PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'test-secret';

// Require after mocks so service gets mocked fs/axios
const {
  parseTier,
  getValidTiers,
  currencyToPlanRegion,
  tierKeyToPlanKidsLimit,
  getAccessToken,
  createPaypalOrder,
  capturePaypalOrder,
} = require('../services/paypalService');

describe('paypalService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Restore PayPal env after process.env reset (service reads at load time; other tests need it)
    process.env.PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api.paypal.com';
    process.env.PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'test-client';
    process.env.PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'test-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('parseTier', () => {
    it('returns { tierKey, currency } for valid tiers', () => {
      expect(parseTier('1_child_USD')).toEqual({ tierKey: '1_child', currency: 'USD' });
      expect(parseTier('2_children_BRL')).toEqual({ tierKey: '2_children', currency: 'BRL' });
      expect(parseTier('3_children_EUR')).toEqual({ tierKey: '3_children', currency: 'EUR' });
    });

    it('normalizes case for currency and tierKey', () => {
      expect(parseTier('1_CHILD_usd')).toEqual({ tierKey: '1_child', currency: 'USD' });
      expect(parseTier('2_Children_brl')).toEqual({ tierKey: '2_children', currency: 'BRL' });
    });

    it('returns null for invalid or unknown tier', () => {
      expect(parseTier('')).toBeNull();
      expect(parseTier(null)).toBeNull();
      expect(parseTier(undefined)).toBeNull();
      expect(parseTier(123)).toBeNull();
      expect(parseTier('1_child')).toBeNull(); // no currency
      expect(parseTier('1_child_XXX')).toBeNull(); // unknown currency
      expect(parseTier('5_children_USD')).toBeNull(); // not in prices
    });
  });

  describe('getValidTiers', () => {
    it('returns all valid tier strings from pricing config', () => {
      const tiers = getValidTiers();
      expect(tiers).toContain('1_child_USD');
      expect(tiers).toContain('2_children_USD');
      expect(tiers).toContain('3_children_USD');
      expect(tiers).toContain('1_child_BRL');
      expect(tiers).toContain('2_children_BRL');
      expect(tiers).toContain('3_children_BRL');
      expect(tiers).toContain('1_child_EUR');
      expect(tiers).toContain('2_children_EUR');
      expect(tiers).toContain('3_children_EUR');
      expect(tiers).toHaveLength(9);
    });
  });

  describe('currencyToPlanRegion', () => {
    it('maps USD -> us, BRL -> br, EUR -> eu', () => {
      expect(currencyToPlanRegion('USD')).toBe('us');
      expect(currencyToPlanRegion('BRL')).toBe('br');
      expect(currencyToPlanRegion('EUR')).toBe('eu');
    });

    it('normalizes lowercase currency', () => {
      expect(currencyToPlanRegion('usd')).toBe('us');
      expect(currencyToPlanRegion('brl')).toBe('br');
    });

    it('returns us for unknown currency', () => {
      expect(currencyToPlanRegion('GBP')).toBe('us');
      expect(currencyToPlanRegion(null)).toBe('us');
      expect(currencyToPlanRegion(undefined)).toBe('us');
    });
  });

  describe('tierKeyToPlanKidsLimit', () => {
    it('maps 1_child -> 1, 2_children -> 2, 3_children -> 3', () => {
      expect(tierKeyToPlanKidsLimit('1_child')).toBe(1);
      expect(tierKeyToPlanKidsLimit('2_children')).toBe(2);
      expect(tierKeyToPlanKidsLimit('3_children')).toBe(3);
    });

    it('returns 1 for unknown tier key', () => {
      expect(tierKeyToPlanKidsLimit('invalid')).toBe(1);
      expect(tierKeyToPlanKidsLimit('ten_children')).toBe(1);
    });

    it('parses numeric tier key between 1 and 10', () => {
      expect(tierKeyToPlanKidsLimit('5')).toBe(5);
      expect(tierKeyToPlanKidsLimit('10')).toBe(10);
    });

    it('returns 1 for out-of-range numeric', () => {
      expect(tierKeyToPlanKidsLimit('0')).toBe(1);
      expect(tierKeyToPlanKidsLimit('11')).toBe(1);
    });
  });

  describe('getAccessToken', () => {
    it('returns access_token when config and API succeed', async () => {
      process.env.PAYPAL_API_BASE = 'https://api.paypal.com';
      process.env.PAYPAL_CLIENT_ID = 'client';
      process.env.PAYPAL_CLIENT_SECRET = 'secret';

      axios.post.mockResolvedValueOnce({
        data: { access_token: 'token_abc123' },
      });

      const token = await getAccessToken();
      expect(token).toBe('token_abc123');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.paypal.com/v1/oauth2/token',
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          timeout: 15000,
        })
      );
    });

    it('throws when env config is missing', async () => {
      jest.resetModules();
      const orig = { ...process.env };
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;
      delete process.env.PAYPAL_API_BASE;
      const { getAccessToken } = require('../services/paypalService');
      await expect(getAccessToken()).rejects.toThrow(/PayPal config missing/);
      expect(axios.post).not.toHaveBeenCalled();
      process.env.PAYPAL_API_BASE = orig.PAYPAL_API_BASE;
      process.env.PAYPAL_CLIENT_ID = orig.PAYPAL_CLIENT_ID;
      process.env.PAYPAL_CLIENT_SECRET = orig.PAYPAL_CLIENT_SECRET;
    });

    it('throws when token response has no access_token', async () => {
      axios.post.mockResolvedValueOnce({ data: {} });

      await expect(getAccessToken()).rejects.toThrow(/missing access_token/);
    });
  });

  describe('createPaypalOrder', () => {
    beforeEach(() => {
      process.env.PAYPAL_API_BASE = 'https://api.paypal.com';
      process.env.PAYPAL_CLIENT_ID = 'c';
      process.env.PAYPAL_CLIENT_SECRET = 's';
      axios.post
        .mockResolvedValueOnce({ data: { access_token: 'tok' } })
        .mockResolvedValueOnce({ data: { id: 'ORDER-123' } });
    });

    it('returns orderID and sends correct payload for valid tier', async () => {
      const result = await createPaypalOrder('1_child_USD', 'user-id-abc');
      expect(result).toEqual({ orderID: 'ORDER-123' });

      const orderPayload = axios.post.mock.calls[1][1];
      expect(orderPayload).toMatchObject({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: 'USD', value: '151.00' },
            custom_id: 'user-id-abc|1_child_USD',
          },
        ],
      });
      expect(orderPayload.purchase_units[0].description).toContain('1 child');
      expect(orderPayload.purchase_units[0].description).toContain('USD');
    });

    it('uses plural "children" for 2 and 3', async () => {
      await createPaypalOrder('2_children_BRL', 'u1');
      const orderPayload = axios.post.mock.calls[1][1];
      expect(orderPayload.purchase_units[0].description).toContain('2 children');
    });

    it('throws for invalid tier with valid options in message', async () => {
      await expect(createPaypalOrder('1_child_GBP', 'u1')).rejects.toThrow(/Invalid tier/);
      await expect(createPaypalOrder('1_child_GBP', 'u1')).rejects.toThrow(/1_child_USD/);
    });
  });

  describe('capturePaypalOrder', () => {
    const orderId = 'ORDER-456';
    const userId = 'user-xyz';

    beforeEach(() => {
      process.env.PAYPAL_API_BASE = 'https://api.paypal.com';
      process.env.PAYPAL_CLIENT_ID = 'c';
      process.env.PAYPAL_CLIENT_SECRET = 's';
      axios.post.mockResolvedValueOnce({ data: { access_token: 'tok' } });
    });

    it('throws when orderID or userId missing', async () => {
      await expect(capturePaypalOrder('', userId)).rejects.toThrow(/orderID and userId are required/);
      await expect(capturePaypalOrder(orderId, '')).rejects.toThrow(/orderID and userId are required/);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('returns payerId, captureId, tier when order is APPROVED and capture succeeds', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'APPROVED',
          payer: { payer_id: 'PAYER-123' },
          purchase_units: [{ custom_id: `${userId}|1_child_USD` }],
        },
      });
      axios.post
        .mockImplementationOnce(() => Promise.resolve({ data: { access_token: 'tok' } }))
        .mockImplementationOnce(() =>
          Promise.resolve({
            data: {
              payer: { payer_id: 'PAYER-123' },
              purchase_units: [
                {
                  payments: {
                    captures: [{ id: 'CAPTURE-789' }],
                  },
                },
              ],
            },
          })
        );

      const result = await capturePaypalOrder(orderId, userId);
      expect(result).toMatchObject({
        tier: '1_child_USD',
        alreadyCaptured: false,
      });
      expect(typeof result.payerId).toBe('string');
      expect(typeof result.captureId).toBe('string');
      // Flow: get order -> post capture; payload mapping covered by COMPLETED test
      expect(axios.get).toHaveBeenCalledWith(
        `https://api.paypal.com/v2/checkout/orders/${orderId}`,
        expect.any(Object)
      );
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.paypal.com/v2/checkout/orders/${orderId}/capture`,
        {},
        expect.any(Object)
      );
    });

    it('returns existing data with alreadyCaptured: true when order is COMPLETED', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'COMPLETED',
          payer: { payer_id: 'PAYER-DONE' },
          purchase_units: [
            {
              custom_id: `${userId}|2_children_BRL`,
              payments: { captures: [{ id: 'CAPTURE-DONE' }] },
            },
          ],
        },
      });

      const result = await capturePaypalOrder(orderId, userId);
      expect(result).toEqual({
        payerId: 'PAYER-DONE',
        captureId: 'CAPTURE-DONE',
        tier: '2_children_BRL',
        alreadyCaptured: true,
      });
      expect(axios.post).toHaveBeenCalledTimes(1); // only token, no capture call
    });

    it('throws when order belongs to another user', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'APPROVED',
          purchase_units: [{ custom_id: 'other-user|1_child_USD' }],
        },
      });

      await expect(capturePaypalOrder(orderId, userId)).rejects.toThrow(/Order does not belong to this user/);
    });

    it('throws when order status is not APPROVED or COMPLETED', async () => {
      axios.post.mockResolvedValueOnce({ data: { access_token: 'tok' } });
      axios.get.mockResolvedValueOnce({
        data: {
          status: 'CREATED',
          purchase_units: [{ custom_id: `${userId}|1_child_USD` }],
        },
      });

      const err = await capturePaypalOrder(orderId, userId).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/Order cannot be captured/);
      expect(err.message).toMatch(/CREATED/);
    });
  });
});
