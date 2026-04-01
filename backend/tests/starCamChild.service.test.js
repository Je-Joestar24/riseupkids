jest.mock('../models', () => ({
  ChildProfile: {
    findOne: jest.fn(),
  },
  StarCamCategory: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
  StarCamMission: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

const { ChildProfile, StarCamCategory, StarCamMission } = require('../models');
const {
  getAvailableCategoriesForChild,
  getLatestMissionsByCategoryForChild,
  getMissionStartFlowForChild,
} = require('../services/starCamChild.service');

describe('starCamChild.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ChildProfile.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'child-1', parent: 'parent-1' }),
    });
  });

  it('returns categories for child', async () => {
    StarCamCategory.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'cat-1', key: 'reading', name: 'Reading' }]),
    });
    StarCamMission.countDocuments.mockResolvedValue(2);

    const result = await getAvailableCategoriesForChild({ parentUserId: 'parent-1', childId: 'child-1' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ key: 'reading', missionCount: 2 });
  });

  it('returns latest up to 3 missions by category', async () => {
    StarCamCategory.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'cat-1', key: 'reading', name: 'Reading' }),
    });
    StarCamMission.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'm1', missionId: 'reading_1', title: 'Mission 1', vocab: [], items: [] },
      ]),
    });

    const result = await getLatestMissionsByCategoryForChild({
      parentUserId: 'parent-1',
      childId: 'child-1',
      categoryKey: 'reading',
    });
    expect(result.limitApplied).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it('returns mission start flow payload with practice + hunt + completion', async () => {
    StarCamMission.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'm1',
        missionId: 'reading_1',
        title: 'Reading Mission',
        category: { key: 'reading', name: 'Reading' },
        introText: 'Start mission',
        introImage: { url: '/intro.png' },
        rewardTitle: 'Mission Accomplished!',
        rewardSubtitle: 'Great job, Explorer!',
        rewardImage: { url: '/reward.png' },
        vocab: [
          {
            displayText: 'Book',
            target: 'book',
            image: { url: '/book.png' },
            audio: { url: '/book.mp3' },
            sortOrder: 0,
          },
        ],
        items: [
          {
            target: 'book',
            prompt: 'Find a book',
            success: 'Yes',
            fail: 'Try again',
            sortOrder: 0,
          },
        ],
      }),
    });

    const result = await getMissionStartFlowForChild({
      parentUserId: 'parent-1',
      childId: 'child-1',
      missionId: 'reading_1',
    });

    expect(result.flow.practice.items[0]).toMatchObject({
      displayText: 'Book',
      target: 'book',
      aiDetection: { enabled: false, status: 'pending_integration' },
    });
    expect(result.flow.starCam.items[0]).toMatchObject({ prompt: 'Find a book' });
    expect(result.flow.completion.title).toBe('Mission Accomplished!');
  });
});

