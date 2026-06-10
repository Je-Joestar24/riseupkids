/**
 * Unit tests for PagSeguro webhook verification and payment analysis.
 */

const crypto = require('crypto');

process.env.PAGSEGURO_ACCESS_TOKEN = 'test-webhook-token';

const {
  verifyWebhookSignature,
  computeWebhookSignature,
  diagnoseWebhookSignature,
  webhookFingerprint,
  analyzeWebhookPayloadPayment,
} = require('../services/pagseguroWebhook.service');

const { analyzeCheckoutPayment } = require('../services/pagseguro.service');

describe('pagseguroWebhook.service', () => {
  const rawBody = '{"id":"CHEC_TEST-1","status":"ACTIVE","reference_id":"ref1"}';

  function expectedSignature(body, token = 'test-webhook-token') {
    return computeWebhookSignature(body, token);
  }

  describe('verifyWebhookSignature', () => {
    it('accepts valid x-authenticity-token', () => {
      const token = expectedSignature(rawBody);
      expect(verifyWebhookSignature(rawBody, token)).toBe(true);
    });

    it('accepts uppercase hex in header', () => {
      const token = expectedSignature(rawBody).toUpperCase();
      expect(verifyWebhookSignature(rawBody, token)).toBe(true);
    });

    it('rejects tampered body', () => {
      const token = expectedSignature(rawBody);
      expect(verifyWebhookSignature(rawBody + ' ', token)).toBe(false);
    });

    it('rejects wrong token', () => {
      expect(verifyWebhookSignature(rawBody, 'deadbeef')).toBe(false);
    });

    it('rejects empty authenticity token', () => {
      expect(verifyWebhookSignature(rawBody, '')).toBe(false);
    });

    it('diagnoseWebhookSignature reports token attempt details', () => {
      const token = expectedSignature(rawBody);
      const diag = diagnoseWebhookSignature(rawBody, token);
      expect(diag.signatureMatched).toBe(true);
      expect(diag.signingTokensConfigured).toBeGreaterThan(0);
      expect(diag.tokenAttempts[0].matches).toBe(true);
    });
  });

  describe('analyzeWebhookPayloadPayment', () => {
    it('detects PAID from ORDE payload with nested charges', () => {
      const result = analyzeWebhookPayloadPayment({
        id: 'ORDE_F53E721D-A38A-4ACD-A000-4354F2BAD40D',
        reference_id: '59b73dd40547492da4946120787102bc',
        charges: [
          {
            id: 'CHAR_4C354EED-74B7-43E4-A8D7-FEF898396130',
            status: 'PAID',
          },
        ],
      });
      expect(result.status).toBe('paid');
      expect(result.paidChargeId).toBe('CHAR_4C354EED-74B7-43E4-A8D7-FEF898396130');
    });

    it('detects AUTHORIZED from CHAR payload', () => {
      const result = analyzeWebhookPayloadPayment({
        id: 'CHAR_1',
        status: 'AUTHORIZED',
      });
      expect(result.status).toBe('paid');
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

  it('detects AUTHORIZED from charges (approved card, pre-capture)', () => {
    const result = analyzeCheckoutPayment({
      status: 'INACTIVE',
      charges: [{ id: 'CHAR_3', status: 'AUTHORIZED' }],
    });
    expect(result.status).toBe('paid');
    expect(result.paidChargeId).toBe('CHAR_3');
  });

  it('detects PAID from payments array', () => {
    const result = analyzeCheckoutPayment({
      status: 'INACTIVE',
      payments: [{ id: 'CHAR_4', status: 'PAID' }],
    });
    expect(result.status).toBe('paid');
    expect(result.paidChargeId).toBe('CHAR_4');
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
