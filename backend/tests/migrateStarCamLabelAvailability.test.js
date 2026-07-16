jest.mock('../models', () => ({
  StarCamMission: {
    find: jest.fn(),
  },
  StarCamVisionLabel: {
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({ connection: { host: 'localhost' } }),
  connection: { close: jest.fn().mockResolvedValue(true) },
}));

const { StarCamMission, StarCamVisionLabel } = require('../models');
const {
  migrateStarCamLabelAvailability,
  collectMissionLabelRefs,
} = require('../scripts/migrateStarCamLabelAvailability');

describe('migrateStarCamLabelAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collectMissionLabelRefs gathers label ids and search keys', () => {
    const refs = collectMissionLabelRefs({
      vocab: [{ labelId: '/m/book', target: 'book' }],
      items: [{ target: 'chair' }],
    });
    expect(refs.labelIds.has('/m/book')).toBe(true);
    expect(refs.searchKeys.has('book')).toBe(true);
    expect(refs.searchKeys.has('chair')).toBe(true);
  });

  it('marks published mission labels and all active labels as available', async () => {
    StarCamMission.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          missionId: 'nature_01',
          vocab: [{ labelId: '/m/book', target: 'book' }],
          items: [{ target: 'book' }],
        },
      ]),
    });
    StarCamVisionLabel.updateMany
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 0 })
      .mockResolvedValueOnce({ modifiedCount: 12 });
    StarCamVisionLabel.countDocuments.mockResolvedValue(12);

    const result = await migrateStarCamLabelAvailability({ selectAllActive: true });

    expect(StarCamVisionLabel.updateMany).toHaveBeenCalledTimes(3);
    expect(result.selectedTotal).toBe(12);
    expect(result.publishedMissions).toBe(1);
  });
});
