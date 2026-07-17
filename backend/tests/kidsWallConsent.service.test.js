jest.mock('../models', () => ({
  ChildProfile: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

const { ChildProfile } = require('../models');
const {
  isKidsWallEnabled,
  assertKidsWallEnabled,
  updateKidsWallConsent,
  NOT_ENABLED_ERROR,
} = require('../services/kidsWallConsent.service');

function mockChild(overrides = {}) {
  return {
    _id: 'child1',
    parent: 'parent1',
    displayName: 'Alex',
    kidsWallEnabled: true,
    kidsWallConsentAt: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn().mockReturnValue({
      _id: 'child1',
      displayName: 'Alex',
      kidsWallEnabled: true,
      kidsWallConsentAt: new Date(),
    }),
    ...overrides,
  };
}

describe('kidsWallConsent.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isKidsWallEnabled', () => {
    it('returns true by default and only blocks when explicitly false', () => {
      expect(isKidsWallEnabled({ kidsWallEnabled: true })).toBe(true);
      expect(isKidsWallEnabled({ kidsWallEnabled: undefined })).toBe(true);
      expect(isKidsWallEnabled({})).toBe(true);
      expect(isKidsWallEnabled({ kidsWallEnabled: false })).toBe(false);
    });
  });

  describe('assertKidsWallEnabled', () => {
    it('passes when child has consent enabled', async () => {
      ChildProfile.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          kidsWallEnabled: true,
          isActive: true,
          displayName: 'Alex',
        }),
      });

      const child = await assertKidsWallEnabled('child1');
      expect(child.displayName).toBe('Alex');
    });

    it('throws when Kids Wall is blocked', async () => {
      ChildProfile.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          kidsWallEnabled: false,
          isActive: true,
          displayName: 'Alex',
        }),
      });

      await expect(assertKidsWallEnabled('child1')).rejects.toThrow(NOT_ENABLED_ERROR);
    });
  });

  describe('updateKidsWallConsent', () => {
    it('allows Kids Wall and stores consent timestamp', async () => {
      const child = mockChild({ kidsWallEnabled: false, kidsWallConsentAt: null });
      ChildProfile.findOne.mockResolvedValue(child);

      const result = await updateKidsWallConsent('child1', 'parent1', {
        enabled: true,
      });

      expect(child.kidsWallEnabled).toBe(true);
      expect(child.kidsWallConsentAt).toBeInstanceOf(Date);
      expect(child.save).toHaveBeenCalled();
      expect(result.kidsWallEnabled).toBe(true);
    });

    it('blocks Kids Wall without extra acknowledgment', async () => {
      const child = mockChild({ kidsWallEnabled: true, kidsWallConsentAt: new Date() });
      child.toObject.mockReturnValue({
        _id: 'child1',
        displayName: 'Alex',
        kidsWallEnabled: false,
        kidsWallConsentAt: child.kidsWallConsentAt,
      });
      ChildProfile.findOne.mockResolvedValue(child);

      await updateKidsWallConsent('child1', 'parent1', { enabled: false });

      expect(child.kidsWallEnabled).toBe(false);
      expect(child.save).toHaveBeenCalled();
    });

    it('throws when child does not belong to parent', async () => {
      ChildProfile.findOne.mockResolvedValue(null);

      await expect(
        updateKidsWallConsent('child1', 'parent1', { enabled: false })
      ).rejects.toThrow('Child profile not found or does not belong to you');
    });
  });
});
