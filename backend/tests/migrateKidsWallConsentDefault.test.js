jest.mock('../models', () => ({
  ChildProfile: {
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({ connection: { host: 'localhost' } }),
  connection: { close: jest.fn().mockResolvedValue(true) },
}));

const { ChildProfile } = require('../models');
const { migrateKidsWallConsentDefault } = require('../scripts/migrateKidsWallConsentDefault');

describe('migrateKidsWallConsentDefault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables Kids Wall for blocked or missing profiles', async () => {
    ChildProfile.countDocuments.mockResolvedValue(3);
    ChildProfile.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const consentAt = new Date('2026-07-18T00:00:00.000Z');
    const result = await migrateKidsWallConsentDefault({ consentAt });

    expect(ChildProfile.countDocuments).toHaveBeenCalledWith({
      $or: [{ kidsWallEnabled: { $ne: true } }, { kidsWallEnabled: { $exists: false } }],
    });
    expect(ChildProfile.updateMany).toHaveBeenCalledWith(
      {
        $or: [{ kidsWallEnabled: { $ne: true } }, { kidsWallEnabled: { $exists: false } }],
      },
      {
        $set: {
          kidsWallEnabled: true,
          kidsWallConsentAt: consentAt,
        },
      }
    );
    expect(result).toEqual({ matchedCount: 3, modifiedCount: 3 });
  });
});
