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
  getMissionPracticeMaterialForChild,
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
        {
          _id: 'm1',
          missionId: 'reading_1',
          title: 'Mission 1',
          missionImage: { url: '/mission.png' },
          vocab: [],
          items: [],
        },
      ]),
    });

    const result = await getLatestMissionsByCategoryForChild({
      parentUserId: 'parent-1',
      childId: 'child-1',
      categoryKey: 'reading',
    });
    expect(result.limitApplied).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ introImageUrl: '/mission.png', missionImageUrl: '/mission.png' });
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
        missionImage: { url: '/mission.png' },
        introImage: null,
        missionShortVideo: { url: '/short.mp4' },
        rewardTitle: 'Mission Accomplished!',
        rewardSubtitle: 'Great job, Explorer!',
        rewardImage: { url: '/reward.png' },
        rewardAudio: { url: '/reward.mp3' },
        rewardVideo: { url: '/reward.mp4' },
        vocab: [
          {
            displayText: 'Book',
            target: 'book',
            image: { url: '/book.png' },
            pronunciationVideo: { url: '/book.mp4' },
            audio: { url: '/book.mp3' },
            introAudio: null,
            tryAgainAudio: { url: '/book-try-again.mp3' },
            successAudio: { url: '/book-success.mp3' },
            order: 1,
          },
          {
            displayText: 'Leaf',
            target: 'leaf',
            image: { url: '/leaf.png' },
            audio: { url: '/leaf.mp3' },
            order: 2,
          },
        ],
        items: [
          {
            target: 'book',
            questionText: 'Is this a book?',
            successText: "That's a book, yeyy.",
            tryAgainText: "Ow that's not a book, let's try again.",
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
      pronunciationVideoUrl: '/book.mp4',
      introAudioUrl: null,
      tryAgainAudioUrl: '/book-try-again.mp3',
      successAudioUrl: '/book-success.mp3',
      aiDetection: { enabled: false, status: 'pending_integration' },
    });
    expect(result.flow.practice.featuredItem).toMatchObject({
      displayText: 'Leaf',
      target: 'leaf',
      imageUrl: '/leaf.png',
      order: 2,
    });
    expect(result.flow.starCam.aiDetection).toMatchObject({
      enabled: false,
      status: 'pending_integration',
    });
    expect(result.flow.starCam.items[0]).toMatchObject({
      prompt: 'Is this a book?',
      questionText: 'Is this a book?',
      questionAudioUrl: '/book.mp3',
      tryAgainText: "Ow that's not a book, let's try again.",
      tryAgainAudioUrl: '/book-try-again.mp3',
      successText: "That's a book, yeyy.",
      successAudioUrl: '/book-success.mp3',
    });
    expect(result.flow.completion.title).toBe('Mission Accomplished!');
    expect(result.flow.completion.rewardAudioUrl).toBe('/reward.mp3');
    expect(result.flow.completion.rewardVideoUrl).toBe('/reward.mp4');
    expect(result.flow.start.shortVideoUrl).toBe('/short.mp4');
    expect(result.flow.start.introImageUrl).toBe('/mission.png');
  });

  it('returns practice material by requested index (default app target index: 6)', async () => {
    StarCamMission.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'm2',
        missionId: 'nature_3',
        title: 'Nature Mission',
        vocab: [
          { displayText: 'One', target: 'one', image: { url: '/1.png' }, audio: { url: '/1.mp3' }, introAudio: null, tryAgainAudio: { url: '/1-try.mp3' }, successAudio: { url: '/1-success.mp3' }, order: 1 },
          { displayText: 'Two', target: 'two', image: { url: '/2.png' }, audio: { url: '/2.mp3' }, introAudio: null, tryAgainAudio: { url: '/2-try.mp3' }, successAudio: { url: '/2-success.mp3' }, order: 2 },
          { displayText: 'Three', target: 'three', image: { url: '/3.png' }, audio: { url: '/3.mp3' }, introAudio: null, tryAgainAudio: { url: '/3-try.mp3' }, successAudio: { url: '/3-success.mp3' }, order: 3 },
          { displayText: 'Four', target: 'four', image: { url: '/4.png' }, audio: { url: '/4.mp3' }, introAudio: null, tryAgainAudio: { url: '/4-try.mp3' }, successAudio: { url: '/4-success.mp3' }, order: 4 },
          { displayText: 'Five', target: 'five', image: { url: '/5.png' }, audio: { url: '/5.mp3' }, introAudio: null, tryAgainAudio: { url: '/5-try.mp3' }, successAudio: { url: '/5-success.mp3' }, order: 5 },
          { displayText: 'Six', target: 'six', image: { url: '/6.png' }, audio: { url: '/6.mp3' }, introAudio: null, tryAgainAudio: { url: '/6-try.mp3' }, successAudio: { url: '/6-success.mp3' }, order: 6 },
          {
            displayText: 'Spoon',
            target: 'spoon',
            image: { url: '/spoon.png' },
            pronunciationVideo: { url: '/spoon.mp4' },
            audio: { url: '/spoon.mp3' },
            introAudio: null,
            tryAgainAudio: { url: '/spoon-try.mp3' },
            successAudio: { url: '/spoon-success.mp3' },
            order: 7,
          },
        ],
      }),
    });

    const result = await getMissionPracticeMaterialForChild({
      parentUserId: 'parent-1',
      childId: 'child-1',
      missionId: 'nature_3',
      index: 6,
    });

    expect(result.totalItems).toBe(7);
    expect(result.resolvedIndex).toBe(6);
    expect(result.item).toMatchObject({
      displayText: 'Spoon',
      target: 'spoon',
      imageUrl: '/spoon.png',
      pronunciationVideoUrl: '/spoon.mp4',
      introAudioUrl: null,
      tryAgainAudioUrl: '/spoon-try.mp3',
      successAudioUrl: '/spoon-success.mp3',
      order: 7,
    });
  });
});

