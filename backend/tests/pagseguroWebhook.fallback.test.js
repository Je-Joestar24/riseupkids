/**
 * Chunk 8 — PagBank API-ownership fallback hardening.
 *
 * When the SHA256 signature check fails (often just CloudFront mangling the raw body), the
 * service falls back to re-fetching the resource from PagBank's own API to confirm ownership.
 * That fallback used to have two real bypass paths that never actually confirmed anything with
 * PagBank:
 *  1. An ORDE_ lookup that FAILED at the API still verified, trusting only the payload's own
 *     reference_id + charges (`order_api_failed_reference_match`).
 *  2. Any payload whose id had no recognized prefix verified on a bare reference_id string match
 *     with no API call at all (`reference_id_only_match`).
 * Both are removed — this chunk requires a `reference_id` AND a successful, matching API
 * re-fetch, with no path that trusts the payload alone. It also adds an ops kill switch
 * (`PAGSEGURO_API_OWNERSHIP_FALLBACK_ENABLED`) and a loud alert log every time the fallback is
 * actually used.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 8)
 */

jest.mock('../services/pagseguro.service');
jest.mock('../services/pagseguroActivation.service');
jest.mock('../models/PagSeguroCheckout');

// config/pagseguro.js reads its signing token(s) into module-level consts at require time —
// set this before pagseguroWebhook.service (which requires it) is first required below.
process.env.PAGSEGURO_ACCESS_TOKEN = 'test-fallback-token';

const {
  getPagbankCheckout,
  getPagbankCharge,
  getPagbankOrder,
  resolveCheckoutPaymentStatus,
  extractCheckoutIdFromCharge,
  extractCheckoutCharges,
} = require('../services/pagseguro.service');
const PagSeguroCheckout = require('../models/PagSeguroCheckout');
const logger = require('../config/logger');
const {
  verifyWebhookPayloadOwnership,
  isApiOwnershipFallbackEnabled,
  computeWebhookSignature,
  processWebhookNotification,
} = require('../services/pagseguroWebhook.service');

function mockRecord(overrides = {}) {
  return {
    referenceId: 'ref-123',
    pagbankCheckoutId: 'CHEC_ABC',
    chargeIds: [],
    status: 'pending',
    webhookEvents: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.PAGSEGURO_API_OWNERSHIP_FALLBACK_ENABLED;
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  jest.spyOn(logger, 'error').mockImplementation(() => {});
  // pagseguroDiagnostics.service's summarizeCharges() calls this (real implementation would
  // return an array); the whole pagseguro.service module is automocked here, so give it a
  // default so ownership-verification branches that build an apiSnapshot don't throw.
  extractCheckoutCharges.mockReturnValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isApiOwnershipFallbackEnabled', () => {
  it('defaults to enabled when unset', () => {
    expect(isApiOwnershipFallbackEnabled()).toBe(true);
  });

  it('is disabled only when explicitly "false"', () => {
    process.env.PAGSEGURO_API_OWNERSHIP_FALLBACK_ENABLED = 'false';
    expect(isApiOwnershipFallbackEnabled()).toBe(false);
    process.env.PAGSEGURO_API_OWNERSHIP_FALLBACK_ENABLED = 'anything-else';
    expect(isApiOwnershipFallbackEnabled()).toBe(true);
  });
});

describe('verifyWebhookPayloadOwnership', () => {
  it('fails closed immediately when the kill switch is off, before any API call', async () => {
    process.env.PAGSEGURO_API_OWNERSHIP_FALLBACK_ENABLED = 'false';
    const record = mockRecord();
    const result = await verifyWebhookPayloadOwnership(
      { id: 'CHEC_ABC', reference_id: 'ref-123' },
      record
    );
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('api_ownership_fallback_disabled');
    expect(getPagbankCheckout).not.toHaveBeenCalled();
  });

  it('fails closed when the payload has no reference_id at all', async () => {
    const record = mockRecord();
    const result = await verifyWebhookPayloadOwnership({ id: 'CHEC_ABC' }, record);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('missing_reference_id');
    expect(getPagbankCheckout).not.toHaveBeenCalled();
  });

  it('fails closed when reference_id does not match the local record', async () => {
    const record = mockRecord({ referenceId: 'ref-123' });
    const result = await verifyWebhookPayloadOwnership(
      { id: 'CHEC_ABC', reference_id: 'ref-OTHER' },
      record
    );
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('reference_id_mismatch');
  });

  it('verifies a CHEC_ payload when the API re-fetch matches', async () => {
    getPagbankCheckout.mockResolvedValue({ id: 'CHEC_ABC', status: 'PAID', reference_id: 'ref-123' });
    const record = mockRecord();
    const result = await verifyWebhookPayloadOwnership(
      { id: 'CHEC_ABC', reference_id: 'ref-123' },
      record
    );
    expect(result.verified).toBe(true);
    expect(getPagbankCheckout).toHaveBeenCalledWith('CHEC_ABC');
  });

  it('verifies a CHAR_ payload when the API re-fetch matches the checkout', async () => {
    getPagbankCharge.mockResolvedValue({ id: 'CHAR_1', status: 'PAID', reference_id: 'ref-123' });
    extractCheckoutIdFromCharge.mockReturnValue('CHEC_ABC');
    const record = mockRecord();
    const result = await verifyWebhookPayloadOwnership(
      { id: 'CHAR_1', reference_id: 'ref-123' },
      record
    );
    expect(result.verified).toBe(true);
  });

  it('an ORDE_ payload whose API lookup FAILS is rejected — no longer trusts the payload alone', async () => {
    getPagbankOrder.mockRejectedValue(new Error('PagBank API down'));
    const record = mockRecord();
    const result = await verifyWebhookPayloadOwnership(
      {
        id: 'ORDE_1',
        reference_id: 'ref-123',
        charges: [{ id: 'CHAR_1', status: 'PAID' }],
      },
      record
    );
    // Old behavior (removed): this used to verify via 'order_api_failed_reference_match'.
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('api_get_order_failed');
  });

  it('an unsupported payload id with a matching reference_id is rejected — no bare match', async () => {
    const record = mockRecord({ referenceId: 'ref-123' });
    const result = await verifyWebhookPayloadOwnership(
      { id: 'SOMETHING_UNKNOWN', reference_id: 'ref-123' },
      record
    );
    // Old behavior (removed): this used to verify via 'reference_id_only_match'.
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('unsupported_payload_id');
    expect(getPagbankCheckout).not.toHaveBeenCalled();
    expect(getPagbankCharge).not.toHaveBeenCalled();
    expect(getPagbankOrder).not.toHaveBeenCalled();
  });
});

describe('processWebhookNotification — API-ownership fallback integration', () => {
  const referenceId = 'ref-123';
  const rawBody = JSON.stringify({ id: 'CHEC_ABC', reference_id: referenceId, status: 'ACTIVE' });

  beforeEach(() => {
    resolveCheckoutPaymentStatus.mockResolvedValue({ status: 'pending', chargeIds: [] });
  });

  it('rejects with 401 when the signature is bad and no local record matches', async () => {
    PagSeguroCheckout.findOne.mockResolvedValue(null);
    await expect(
      processWebhookNotification({ rawBody, authenticityToken: 'bad-token', webhookKind: 'checkout' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects with 401 and does not alert when the kill switch is off, even with a matching local record', async () => {
    process.env.PAGSEGURO_API_OWNERSHIP_FALLBACK_ENABLED = 'false';
    const record = mockRecord({ referenceId, pagbankCheckoutId: 'CHEC_ABC' });
    PagSeguroCheckout.findOne.mockResolvedValue(record);

    await expect(
      processWebhookNotification({ rawBody, authenticityToken: 'bad-token', webhookKind: 'checkout' })
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(getPagbankCheckout).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('accepts via the fallback and logs a loud alert when the API confirms ownership', async () => {
    const record = mockRecord({ referenceId, pagbankCheckoutId: 'CHEC_ABC' });
    PagSeguroCheckout.findOne.mockResolvedValue(record);
    getPagbankCheckout.mockResolvedValue({ id: 'CHEC_ABC', status: 'ACTIVE', reference_id: referenceId });

    const result = await processWebhookNotification({
      rawBody,
      authenticityToken: 'bad-token',
      webhookKind: 'checkout',
    });

    expect(result.authMethod).toBe('api_ownership');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ alert: 'pagseguro_api_ownership_fallback_used' }),
      expect.stringContaining('ALERT')
    );
  });

  it('accepts via the real signature with no alert logged (the normal path)', async () => {
    const record = mockRecord({ referenceId, pagbankCheckoutId: 'CHEC_ABC' });
    PagSeguroCheckout.findOne.mockResolvedValue(record);
    const validToken = computeWebhookSignature(rawBody, 'test-fallback-token');

    const result = await processWebhookNotification({
      rawBody,
      authenticityToken: validToken,
      webhookKind: 'checkout',
    });

    expect(result.authMethod).toBe('signature');
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
