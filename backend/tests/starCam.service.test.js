jest.mock('../models', () => ({
  ChildProfile: {
    findOne: jest.fn(),
  },
  StarCamEvent: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  StarCamMission: {
    find: jest.fn(),
  },
}));

const { ChildProfile, StarCamEvent, StarCamMission } = require('../models');
const { trackStarCamEvent, listStarCamEvents, listStarCamMissions } = require('../services/starCam.service');

describe('starCam.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockChildFound(child = { _id: 'child-1', parent: 'parent-1', displayName: 'Emma' }) {
    ChildProfile.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(child),
    });
  }

  it('tracks round started event successfully', async () => {
    mockChildFound();
    StarCamEvent.create.mockResolvedValue({
      toObject: () => ({ _id: 'evt-1', event: 'ispy_round_started' }),
    });

    const result = await trackStarCamEvent({
      parentUserId: 'parent-1',
      childId: 'child-1',
      eventType: 'ispy_round_started',
      payload: {
        roundId: 'round-1',
        targetWord: 'Book',
        mode: 'single_target',
        timestamp: '2026-01-26T18:12:10Z',
      },
    });

    expect(result).toMatchObject({ event: 'ispy_round_started' });
    expect(StarCamEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        targetWord: 'book',
      })
    );
  });

  it('rejects when child does not belong to parent', async () => {
    ChildProfile.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      trackStarCamEvent({
        parentUserId: 'parent-1',
        childId: 'child-x',
        eventType: 'ispy_round_started',
        payload: { roundId: 'r1', targetWord: 'book' },
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('requires game targets for game completed event', async () => {
    mockChildFound();

    await expect(
      trackStarCamEvent({
        parentUserId: 'parent-1',
        childId: 'child-1',
        eventType: 'ispy_game_completed',
        payload: { gameId: 'game-1', targets: [] },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lists events with pagination metadata', async () => {
    StarCamEvent.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'evt-1' }]),
    });
    StarCamEvent.countDocuments.mockResolvedValue(1);

    const result = await listStarCamEvents({
      parentUserId: 'parent-1',
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(StarCamEvent.countDocuments).toHaveBeenCalled();
  });

  it('lists published missions with mission image url', async () => {
    mockChildFound();
    StarCamMission.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'mission-1',
          missionId: 'nature_01',
          title: 'Nature Mission',
          status: 'published',
          category: { _id: 'cat-1', key: 'nature', name: 'Nature' },
          missionImage: { url: '/mission.png' },
          vocab: [{}, {}],
          items: [{}, {}],
        },
      ]),
    });

    const result = await listStarCamMissions({
      parentUserId: 'parent-1',
      childId: 'child-1',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      missionId: 'nature_01',
      missionImageUrl: '/mission.png',
      vocabCount: 2,
      itemCount: 2,
    });
  });
});
