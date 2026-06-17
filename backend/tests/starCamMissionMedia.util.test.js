jest.mock('../models', () => ({
  StarCamMission: {
    find: jest.fn(),
  },
}));

const { StarCamMission } = require('../models');
const { getStarCamMissionVideoMediaIds } = require('../utils/starCamMissionMedia.util');

describe('starCamMissionMedia.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collects mission short, intro, reward, and pronunciation video IDs', async () => {
    StarCamMission.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            introVideo: 'intro-1',
            missionShortVideo: 'short-1',
            rewardVideo: 'reward-1',
            vocab: [
              { pronunciationVideo: 'pron-1' },
              { pronunciationVideo: null },
            ],
          },
          {
            introVideo: null,
            missionShortVideo: 'short-2',
            rewardVideo: null,
            vocab: [],
          },
        ]),
      }),
    });

    const ids = await getStarCamMissionVideoMediaIds();

    expect(ids).toEqual(expect.arrayContaining(['intro-1', 'short-1', 'reward-1', 'pron-1', 'short-2']));
    expect(ids).toHaveLength(5);
  });

  it('returns an empty array when no missions reference videos', async () => {
    StarCamMission.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const ids = await getStarCamMissionVideoMediaIds();
    expect(ids).toEqual([]);
  });
});
