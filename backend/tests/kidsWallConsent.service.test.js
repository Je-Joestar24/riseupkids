/**
 * RUK-SEC-006 — Kids Wall is opt-in: a child only has real consent when kidsWallEnabled is
 * exactly true AND a consent timestamp exists. Neither field alone is sufficient.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-006
 */
jest.mock('../models', () => ({
  ChildProfile: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

const { ChildProfile } = require('../models');
const {
  hasKidsWallConsent,
  assertKidsWallEnabled,
  updateKidsWallConsent,
  NOT_ENABLED_ERROR,
} = require('../services/kidsWallConsent.service');

function mockChild(overrides = {}) {
  return {
    _id: 'child1',
    parent: 'parent1',
    displayName: 'Alex',
    kidsWallEnabled: false,
    kidsWallConsentAt: null,
    kidsWallConsentIp: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('kidsWallConsent.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasKidsWallConsent', () => {
    it('requires both the enabled flag AND a consent timestamp', () => {
      expect(hasKidsWallConsent({ kidsWallEnabled: true, kidsWallConsentAt: new Date() })).toBe(true);
    });

    it('is false when the flag defaults true but there is no consent timestamp (the RUK-SEC-006 bug)', () => {
      expect(hasKidsWallConsent({ kidsWallEnabled: true, kidsWallConsentAt: null })).toBe(false);
      expect(hasKidsWallConsent({ kidsWallEnabled: true })).toBe(false);
    });

    it('is false when the flag is missing/undefined, regardless of a stale timestamp', () => {
      expect(hasKidsWallConsent({ kidsWallConsentAt: new Date() })).toBe(false);
      expect(hasKidsWallConsent({})).toBe(false);
      expect(hasKidsWallConsent(null)).toBe(false);
    });

    it('is false when explicitly disabled even if a consent timestamp remains on file', () => {
      expect(hasKidsWallConsent({ kidsWallEnabled: false, kidsWallConsentAt: new Date() })).toBe(false);
    });
  });

  describe('assertKidsWallEnabled', () => {
    it('passes when the child has real, current consent', async () => {
      ChildProfile.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          kidsWallEnabled: true,
          kidsWallConsentAt: new Date(),
          isActive: true,
          displayName: 'Alex',
        }),
      });

      const child = await assertKidsWallEnabled('child1');
      expect(child.displayName).toBe('Alex');
    });

    it('throws when kidsWallEnabled is true but there is no consent timestamp', async () => {
      ChildProfile.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          kidsWallEnabled: true,
          kidsWallConsentAt: null,
          isActive: true,
          displayName: 'Alex',
        }),
      });

      await expect(assertKidsWallEnabled('child1')).rejects.toThrow(NOT_ENABLED_ERROR);
    });

    it('throws when Kids Wall is off', async () => {
      ChildProfile.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          kidsWallEnabled: false,
          kidsWallConsentAt: null,
          isActive: true,
          displayName: 'Alex',
        }),
      });

      await expect(assertKidsWallEnabled('child1')).rejects.toThrow(NOT_ENABLED_ERROR);
    });

    it('throws "not found" for an inactive child even if consent looks valid', async () => {
      ChildProfile.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          kidsWallEnabled: true,
          kidsWallConsentAt: new Date(),
          isActive: false,
          displayName: 'Alex',
        }),
      });

      await expect(assertKidsWallEnabled('child1')).rejects.toThrow('Child profile not found');
    });
  });

  describe('updateKidsWallConsent', () => {
    it('allows Kids Wall and stores the consent timestamp and IP', async () => {
      const child = mockChild();
      ChildProfile.findOne.mockResolvedValue(child);

      const result = await updateKidsWallConsent(
        'child1',
        'parent1',
        { enabled: true },
        { ip: '203.0.113.5' }
      );

      expect(child.kidsWallEnabled).toBe(true);
      expect(child.kidsWallConsentAt).toBeInstanceOf(Date);
      expect(child.kidsWallConsentIp).toBe('203.0.113.5');
      expect(child.save).toHaveBeenCalled();
      expect(result.kidsWallEnabled).toBe(true);
    });

    it('turning it off clears the grant but keeps the historical consent timestamp', async () => {
      const consentedAt = new Date('2026-01-01T00:00:00Z');
      const child = mockChild({ kidsWallEnabled: true, kidsWallConsentAt: consentedAt });
      ChildProfile.findOne.mockResolvedValue(child);

      await updateKidsWallConsent('child1', 'parent1', { enabled: false });

      expect(child.kidsWallEnabled).toBe(false);
      expect(child.kidsWallConsentAt).toBe(consentedAt);
      expect(child.save).toHaveBeenCalled();
    });

    it('throws when child does not belong to parent', async () => {
      ChildProfile.findOne.mockResolvedValue(null);

      await expect(
        updateKidsWallConsent('child1', 'parent1', { enabled: false })
      ).rejects.toThrow('Child profile not found or does not belong to you');
    });

    it('rejects a non-boolean enabled value', async () => {
      await expect(
        updateKidsWallConsent('child1', 'parent1', { enabled: 'true' })
      ).rejects.toThrow('enabled must be true or false');
    });
  });
});
