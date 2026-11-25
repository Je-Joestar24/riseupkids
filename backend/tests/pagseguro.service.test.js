/**
 * Unit tests for PagSeguro (PagBank) checkout service.
 * Prices come from the ONE price list (BRL annual, 1 to 4 children); there is no box and no file to mock.
 */

jest.mock('axios');

const axios = require('axios');

process.env.PAGSEGURO_ACCESS_TOKEN = process.env.PAGSEGURO_ACCESS_TOKEN || 'test-token';
process.env.PAGSEGURO_API_BASE = process.env.PAGSEGURO_API_BASE || 'https://sandbox.api.pagseguro.com';

const {
  normalizeTaxId,
  isValidCpf,
  normalizeBrazilPhone,
  buildCheckoutLineItems,
  extractPayUrl,
  getPlanAmountCents,
  normalizeChildCount,
  getPagseguroConfig,
  MIN_CHILDREN,
  MAX_CHILDREN,
  createPagbankCheckout,
  buildCheckoutPayload,
  extractOrdersFromListResponse,
  resolveCheckoutPaymentStatus,
} = require('../services/pagseguro.service');

describe('pagseguro.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeTaxId / isValidCpf', () => {
    it('strips formatting from CPF', () => {
      expect(normalizeTaxId('529.982.247-25')).toBe('52998224725');
    });

    it('validates a known valid CPF', () => {
      expect(isValidCpf('52998224725')).toBe(true);
    });

    it('rejects invalid CPF', () => {
      expect(isValidCpf('11111111111')).toBe(false);
      expect(isValidCpf('123')).toBe(false);
    });
  });

  describe('normalizeBrazilPhone', () => {
    it('normalizes DDD and 9-digit mobile', () => {
      expect(normalizeBrazilPhone({ area: '27', number: '999999999' })).toEqual({
        country: '+55',
        area: '27',
        number: '999999999',
      });
    });

    it('rejects invalid mobile', () => {
      expect(normalizeBrazilPhone({ area: '27', number: '888888888' })).toBeNull();
    });
  });

  describe('buildCheckoutLineItems', () => {
    // BRL annual price from the client's sheet, in centavos (typed here on purpose, not read from the config)
    const SHEET_BRL = { 1: 69900, 2: 129900, 3: 179900, 4: 219900 };

    it.each([[1], [2], [3], [4]])('%i child(ren): one plan line and a total equal to the sheet price', (kids) => {
      const { items, totalCents } = buildCheckoutLineItems(kids);
      expect(items).toHaveLength(1);
      expect(items[0].unit_amount).toBe(SHEET_BRL[kids]);
      expect(items[0].reference_id).toBe(`family-plan-${kids}`);
      expect(items[0].quantity).toBe(1);
      expect(totalCents).toBe(SHEET_BRL[kids]);
    });

    it('the old R$799 for one child is gone', () => {
      expect(buildCheckoutLineItems(1).totalCents).not.toBe(79900);
    });

    it('there is no activity box: a second argument (old callers passed addBox) changes nothing', () => {
      const withFlag = buildCheckoutLineItems(2, true);
      expect(withFlag.items).toHaveLength(1);
      expect(withFlag.totalCents).toBe(129900);
      expect(JSON.stringify(withFlag)).not.toMatch(/box/i);
    });

    it('accepts a plain digit string', () => {
      expect(buildCheckoutLineItems('3').totalCents).toBe(179900);
    });

    it.each([[0], [5], [10], [-1], [2.5], ['abc'], [null], [undefined], [true]])('refuses %p (a 400), never rounds it into a plan', (kids) => {
      expect(() => buildCheckoutLineItems(kids)).toThrow(expect.objectContaining({ code: 'INVALID_CHILD_COUNT', statusCode: 400 }));
    });
  });

  describe('limits and public config', () => {
    it('allows 1 to 4 children', () => {
      expect(MIN_CHILDREN).toBe(1);
      expect(MAX_CHILDREN).toBe(4);
      expect(normalizeChildCount(4)).toBe(4);
      expect(() => normalizeChildCount(5)).toThrow(/1 to 4/);
    });

    it('tells the sale site 1 to 4 children in BRL, with the installment limit', () => {
      const config = getPagseguroConfig();
      expect(config).toMatchObject({ region: 'br', currency: 'BRL', minChildren: 1, maxChildren: 4 });
      expect(config.installmentsLimit).toBeDefined();
    });
  });

  describe('extractPayUrl', () => {
    it('finds PAY link', () => {
      const url = extractPayUrl([
        { rel: 'SELF', href: 'https://api.example/checkouts/CHEC_1' },
        { rel: 'PAY', href: 'https://pay.example/session' },
      ]);
      expect(url).toBe('https://pay.example/session');
    });
  });

  describe('buildCheckoutPayload', () => {
    const user = { name: 'Maria Silva', email: 'maria@test.com' };

    it('includes installment config and customer', () => {
      const payload = buildCheckoutPayload({
        referenceId: 'ref123',
        user,
        taxId: '52998224725',
        phone: { area: '11', number: '987654321' },
        childCount: 1,
      });
      expect(payload.reference_id).toBe('ref123');
      expect(payload.customer.tax_id).toBe('52998224725');
      expect(payload.payment_methods_configs[0].config_options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ option: 'INSTALLMENTS_LIMIT' }),
          expect.objectContaining({ option: 'INTEREST_FREE_INSTALLMENTS' }),
        ])
      );
    });

    it('throws on invalid CPF', () => {
      expect(() =>
        buildCheckoutPayload({
          referenceId: 'ref',
          user,
          taxId: '11111111111',
          phone: { area: '11', number: '987654321' },
          childCount: 1,
        })
      ).toThrow(/Invalid CPF/);
    });

    it('replaces localhost redirect URLs with server SALE_APP_BASE_URL', () => {
      process.env.SALE_APP_BASE_URL = 'https://riseup.kids';
      const payload = buildCheckoutPayload({
        referenceId: 'ref123',
        user,
        taxId: '52998224725',
        phone: { area: '11', number: '987654321' },
        childCount: 1,
        successUrl: 'http://localhost:4175/checkout/success?provider=pagseguro',
        cancelUrl: 'http://localhost:4175/checkout/register',
      });
      expect(payload.redirect_url).toBe('https://riseup.kids/checkout/success?provider=pagseguro');
      expect(payload.return_url).toBe('https://riseup.kids/checkout/register');
    });
  });

  describe('createPagbankCheckout', () => {
    const user = { name: 'Maria Silva', email: 'maria@test.com' };

    it('POSTs to PagBank and returns checkoutId and payUrl', async () => {
      axios.post.mockResolvedValue({
        data: {
          id: 'CHEC_TEST-123',
          links: [{ rel: 'PAY', href: 'https://pagamento.example/pay' }],
          expiration_date: '2026-06-01T12:00:00-03:00',
        },
      });

      const result = await createPagbankCheckout({
        referenceId: 'abc123',
        user,
        childCount: 1,
        taxId: '52998224725',
        phone: { area: '11', number: '987654321' },
      });

      expect(result.checkoutId).toBe('CHEC_TEST-123');
      expect(result.payUrl).toBe('https://pagamento.example/pay');
      expect(result.referenceId).toBe('abc123');
      expect(result.amountCents).toBe(69900);

      expect(axios.post).toHaveBeenCalledWith(
        'https://sandbox.api.pagseguro.com/checkouts',
        expect.objectContaining({ reference_id: 'abc123' }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    const ok = { data: { id: 'CHEC_1', links: [{ rel: 'PAY', href: 'https://pagamento.example/pay' }] } };
    const person = { taxId: '52998224725', phone: { area: '11', number: '987654321' } };

    it('sends exactly one item, the plan price, and nothing for a box (even if an old caller asks for one)', async () => {
      axios.post.mockResolvedValue(ok);

      const result = await createPagbankCheckout({ user, childCount: 3, addBox: true, ...person });

      const sent = axios.post.mock.calls[0][1];
      expect(sent.items).toEqual([expect.objectContaining({ reference_id: 'family-plan-3', unit_amount: 179900, quantity: 1 })]);
      expect(JSON.stringify(sent)).not.toMatch(/box/i);
      expect(result.amountCents).toBe(179900);
    });

    it('the amount saved for the order is the amount sent to PagBank', async () => {
      axios.post.mockResolvedValue(ok);
      const result = await createPagbankCheckout({ user, childCount: 4, ...person });
      const sent = axios.post.mock.calls[0][1];
      expect(sent.items.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0)).toBe(result.amountCents);
      expect(result.amountCents).toBe(219900);
    });

    it.each([[0], [5], [99], ['abc'], [2.5]])('refuses %p children before calling PagBank', async (kids) => {
      await expect(createPagbankCheckout({ user, childCount: kids, ...person })).rejects.toMatchObject({
        code: 'INVALID_CHILD_COUNT',
        statusCode: 400,
      });
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('maps 400 errors to client-friendly message', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error_messages: [
              {
                code: 'invalid_format',
                parameter_name: 'customer.tax_id',
                description: 'Invalid tax id',
              },
            ],
          },
        },
      });

      await expect(
        createPagbankCheckout({
          user,
          childCount: 1,
          taxId: '52998224725',
          phone: { area: '11', number: '987654321' },
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/CPF|tax/i),
        statusCode: 400,
      });
    });
  });

  describe('getPlanAmountCents', () => {
    it('reads from the one price list', () => {
      expect(getPlanAmountCents(2)).toBe(129900);
      expect(getPlanAmountCents(4)).toBe(219900);
    });

    it('refuses sizes that are not sold', () => {
      expect(() => getPlanAmountCents(5)).toThrow(expect.objectContaining({ code: 'INVALID_CHILD_COUNT' }));
    });
  });

  describe('extractOrdersFromListResponse', () => {
    it('reads orders array from list response', () => {
      const orders = [{ id: 'ORDE_1' }, { id: 'ORDE_2' }];
      expect(extractOrdersFromListResponse({ orders })).toEqual(orders);
    });

    it('wraps single order object', () => {
      const order = { id: 'ORDE_1', charges: [] };
      expect(extractOrdersFromListResponse(order)).toEqual([order]);
    });
  });

  describe('resolveCheckoutPaymentStatus', () => {
    it('falls back to GET /orders?reference_id when checkout has no charges', async () => {
      axios.get.mockImplementation((url) => {
        if (String(url).includes('/orders')) {
          return Promise.resolve({
            data: {
              orders: [
                {
                  id: 'ORDE_PAID',
                  reference_id: 'ref-abc',
                  charges: [{ id: 'CHAR_FROM_ORDER', status: 'PAID' }],
                },
              ],
            },
          });
        }
        return Promise.reject(new Error('unexpected url: ' + url));
      });

      const result = await resolveCheckoutPaymentStatus(
        { id: 'CHEC_1', status: 'INACTIVE', reference_id: 'ref-abc' },
        { referenceId: 'ref-abc' }
      );

      expect(result.status).toBe('paid');
      expect(result.paidChargeId).toBe('CHAR_FROM_ORDER');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.objectContaining({
          params: { reference_id: 'ref-abc' },
        })
      );
    });

    it('resolves PAID via GET /charges when order lists charge id only', async () => {
      axios.get.mockImplementation((url) => {
        if (String(url).includes('/orders')) {
          return Promise.resolve({
            data: {
              orders: [
                {
                  id: 'ORDE_1',
                  charges: [{ id: 'CHAR_REMOTE', status: 'WAITING' }],
                },
              ],
            },
          });
        }
        if (String(url).includes('/charges/CHAR_REMOTE')) {
          return Promise.resolve({ data: { id: 'CHAR_REMOTE', status: 'PAID' } });
        }
        return Promise.reject(new Error('unexpected url: ' + url));
      });

      const result = await resolveCheckoutPaymentStatus(
        { id: 'CHEC_1', status: 'ACTIVE' },
        { referenceId: 'ref-xyz' }
      );

      expect(result.status).toBe('paid');
      expect(result.paidChargeId).toBe('CHAR_REMOTE');
    });
  });
});
