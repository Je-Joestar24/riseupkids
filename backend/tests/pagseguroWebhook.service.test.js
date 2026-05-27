/**
 * Unit tests for PagSeguro webhook verification and payment analysis.
 */

const crypto = require('crypto');

process.env.PAGSEGURO_ACCESS_TOKEN = 'test-webhook-token';

const {
  verifyWebhookSignature,
  webhookFingerprint,
} = require('../services/pagseguroWebhook.service');

const { analyzeCheckoutPayment } = require('../services/pagseguro.service');

describe('pagseguroWebhook.service', () => {
  const rawBody = '{"id":"CHEC_TEST-1","status":"ACTIVE","reference_id":"ref1"}';

  function expectedSignature(body) {
    return crypto
      .createHash('sha256')
      .update(`test-webhook-token-${body}`, 'utf8')
      .digest('hex');
  }

  describe('verifyWebhookSignature', () => {
    it('accepts valid x-authenticity-token', () => {
      const token = expectedSignature(rawBody);
      expect(verifyWebhookSignature(rawBody, token)).toBe(true);
    });

    it('rejects tampered body', () => {
      const token = expectedSignature(rawBody);
      expect(verifyWebhookSignature(rawBody + ' ', token)).toBe(false);
    });

    it('rejects wrong token', () => {
      expect(verifyWebhookSignature(rawBody, 'deadbeef')).toBe(false);
    });
  });

  describe('webhookFingerprint', () => {
    it('is stable for same body', () => {
      expect(webhookFingerprint(rawBody)).toBe(webhookFingerprint(rawBody));
    });
  });
});

describe('analyzeCheckoutPayment', () => {
  it('detects PAID from charges', () => {
    const result = analyzeCheckoutPayment({
      status: 'ACTIVE',
      charges: [{ id: 'CHAR_1', status: 'PAID' }],
    });
    expect(result.status).toBe('paid');
    expect(result.paidChargeId).toBe('CHAR_1');
  });

  it('maps EXPIRED checkout', () => {
    expect(analyzeCheckoutPayment({ status: 'EXPIRED' }).status).toBe('expired');
  });

  it('maps DECLINED charge', () => {
    expect(
      analyzeCheckoutPayment({
        charges: [{ id: 'CHAR_2', status: 'DECLINED' }],
      }).status
    ).toBe('declined');
  });
});
