/**
 * Unit tests for PagSeguro (PagBank) checkout service.
 */

const PRICES_FIXTURE = {
  currency: 'BRL',
  planAmountCents: {
    '1': 79900,
    '2': 129900,
  },
  boxAmountCentsPerChild: 29700,
};

const mockPricesJson = JSON.stringify(PRICES_FIXTURE);

jest.mock('fs', () => ({
  existsSync: jest.fn((p) => p && String(p).includes('pagseguroFamilyPlanPrices.json')),
  readFileSync: jest.fn(() => mockPricesJson),
}));

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
  createPagbankCheckout,
  buildCheckoutPayload,
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
    it('returns plan-only line item and total', () => {
      const { items, totalCents } = buildCheckoutLineItems(1, false);
      expect(items).toHaveLength(1);
      expect(items[0].unit_amount).toBe(79900);
      expect(totalCents).toBe(79900);
    });

    it('adds box line item when addBox is true', () => {
      const { items, totalCents } = buildCheckoutLineItems(2, true);
      expect(items).toHaveLength(2);
      expect(totalCents).toBe(129900 + 29700 * 2);
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
        addBox: false,
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
          addBox: false,
        })
      ).toThrow(/Invalid CPF/);
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
      expect(result.amountCents).toBe(79900);

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
    it('reads from pricing config', () => {
      expect(getPlanAmountCents(2)).toBe(129900);
    });
  });
});
