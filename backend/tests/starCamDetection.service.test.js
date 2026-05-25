jest.mock('../services/googleVision.service', () => ({
  isVisionConfigured: jest.fn(),
  detectLabelsFromImageBuffer: jest.fn(),
}));

jest.mock('../services/starCamChild.service', () => ({
  assertChildOwnership: jest.fn().mockResolvedValue({ _id: 'child-1' }),
}));

jest.mock('../models', () => ({
  StarCamMission: {
    findOne: jest.fn(),
  },
}));

const googleVisionService = require('../services/googleVision.service');
const { StarCamMission } = require('../models');
const {
  detectMissionObjectForChild,
  evaluateLabelsForTarget,
  resolveHuntItem,
} = require('../services/starCamDetection.service');

describe('starCamDetection.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    googleVisionService.isVisionConfigured.mockReturnValue(true);
  });

  it('resolveHuntItem picks by itemOrder (1-based)', () => {
    const items = [
      { target: 'a', sortOrder: 0 },
      { target: 'b', sortOrder: 1 },
    ];
    expect(resolveHuntItem(items, { itemOrder: 2 }).target).toBe('b');
  });

  it('resolveHuntItem picks by sortOrder', () => {
    const items = [
      { target: 'a', sortOrder: 0 },
      { target: 'b', sortOrder: 1 },
    ];
    expect(resolveHuntItem(items, { sortOrder: 1 }).target).toBe('b');
  });

  it('evaluateLabelsForTarget passes when book label exceeds threshold', () => {
    const labels = [{ description: 'Book', score: 0.9 }];
    const { passes, best } = evaluateLabelsForTarget('book', labels, 0.75);
    expect(passes).toBe(true);
    expect(best.matchedLabel).toBe('Book');
  });

  it('detectMissionObjectForChild returns matched when vision agrees', async () => {
    StarCamMission.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        missionId: 'reading_1',
        title: 'Reading',
        items: [
          {
            target: 'book',
            sortOrder: 0,
            questionText: 'Is this a book?',
            successText: "That's a book, yeyy.",
            successAudio: { url: '/book-success.mp3' },
            tryAgainText: "Ow that's not a book, let's try again.",
            tryAgainAudio: { url: '/book-try-again.mp3' },
          },
        ],
        vocab: [],
      }),
    });
    googleVisionService.detectLabelsFromImageBuffer.mockResolvedValue({
      labels: [{ description: 'Book', score: 0.92 }],
    });

    const data = await detectMissionObjectForChild({
      parentUserId: 'parent-1',
      childId: 'child-1',
      missionId: 'reading_1',
      itemOrder: 1,
      imageBuffer: Buffer.from([0xff, 0xd8, 0xff]),
    });

    expect(data.status).toBe('matched');
    expect(data.result.isMatch).toBe(true);
    expect(data.ui.tone).toBe('success');
    expect(data.ui.message).toBe("That's a book, yeyy.");
    expect(data.ui.audioUrl).toBe('/book-success.mp3');
  });

  it('detectMissionObjectForChild returns try-again audio when vision does not match', async () => {
    StarCamMission.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        missionId: 'reading_1',
        title: 'Reading',
        items: [
          {
            target: 'book',
            sortOrder: 0,
            tryAgainText: "Ow that's not a book, let's try again.",
            tryAgainAudio: { url: '/book-try-again.mp3' },
            successAudio: { url: '/book-success.mp3' },
          },
        ],
        vocab: [],
      }),
    });
    googleVisionService.detectLabelsFromImageBuffer.mockResolvedValue({
      labels: [{ description: 'Chair', score: 0.94 }],
    });

    const data = await detectMissionObjectForChild({
      parentUserId: 'parent-1',
      childId: 'child-1',
      missionId: 'reading_1',
      itemOrder: 1,
      imageBuffer: Buffer.from([0xff, 0xd8, 0xff]),
    });

    expect(data.status).toBe('not_matched');
    expect(data.result.isMatch).toBe(false);
    expect(data.ui.tone).toBe('retry');
    expect(data.ui.audioUrl).toBe('/book-try-again.mp3');
  });

  it('prefers real vocab feedback audio over seeded item placeholder audio', async () => {
    StarCamMission.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        missionId: 'reading_seed_1',
        title: 'Reading',
        items: [
          {
            target: 'headphones',
            sortOrder: 0,
            tryAgainText: 'Try again.',
            tryAgainAudio: { url: '/uploads/media/audio/starcam_seed_vocabulary_audio_temp.mp3' },
            successAudio: { url: '/uploads/media/audio/starcam_seed_vocabulary_audio_temp.mp3' },
          },
        ],
        vocab: [
          {
            target: 'headphones',
            tryAgainAudio: { url: 'https://cdn.example.com/headphones-try.m4a' },
            successAudio: { url: 'https://cdn.example.com/headphones-success.m4a' },
          },
        ],
      }),
    });
    googleVisionService.detectLabelsFromImageBuffer.mockResolvedValue({
      labels: [{ description: 'Audio equipment', score: 0.94 }],
    });

    const data = await detectMissionObjectForChild({
      parentUserId: 'parent-1',
      childId: 'child-1',
      missionId: 'reading_seed_1',
      itemOrder: 1,
      imageBuffer: Buffer.from([0xff, 0xd8, 0xff]),
    });

    expect(data.status).toBe('not_matched');
    expect(data.ui.audioUrl).toBe('https://cdn.example.com/headphones-try.m4a');
  });

  it('detectMissionObjectForChild returns 503 when vision not configured', async () => {
    googleVisionService.isVisionConfigured.mockReturnValue(false);
    await expect(
      detectMissionObjectForChild({
        parentUserId: 'parent-1',
        childId: 'child-1',
        missionId: 'reading_1',
        itemOrder: 1,
        imageBuffer: Buffer.from([1]),
      })
    ).rejects.toMatchObject({ statusCode: 503 });
  });
});
