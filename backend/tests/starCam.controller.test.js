jest.mock('../services/starCam.service', () => ({
  trackStarCamEvent: jest.fn(),
  listStarCamEvents: jest.fn(),
  listStarCamMissions: jest.fn(),
}));

const {
  trackRoundStarted,
  trackTargetFound,
  trackGameCompleted,
  getStarCamEvents,
  getStarCamMissions,
} = require('../controllers/starCam.controller');
const starCamService = require('../services/starCam.service');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('starCam.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trackRoundStarted returns 201 with data', async () => {
    starCamService.trackStarCamEvent.mockResolvedValue({ _id: 'evt-1' });
    const req = {
      user: { _id: 'parent-1' },
      body: { childId: 'child-1', roundId: 'round-1', targetWord: 'book' },
    };
    const res = buildRes();
    const next = jest.fn();

    await trackRoundStarted(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(starCamService.trackStarCamEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ispy_round_started',
      })
    );
  });

  it('trackTargetFound forwards service errors to next', async () => {
    const error = new Error('bad payload');
    starCamService.trackStarCamEvent.mockRejectedValue(error);
    const req = { user: { _id: 'parent-1' }, body: {} };
    const res = buildRes();
    const next = jest.fn();

    await trackTargetFound(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('trackGameCompleted returns success response', async () => {
    starCamService.trackStarCamEvent.mockResolvedValue({ _id: 'evt-3' });
    const req = {
      user: { _id: 'parent-1' },
      body: { childId: 'child-1', gameId: 'game-1', targets: ['book'] },
    };
    const res = buildRes();
    const next = jest.fn();

    await trackGameCompleted(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('getStarCamEvents returns paginated payload', async () => {
    starCamService.listStarCamEvents.mockResolvedValue({
      items: [{ _id: 'evt-1' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
    });
    const req = {
      user: { _id: 'parent-1' },
      query: { page: '1', limit: '20' },
    };
    const res = buildRes();
    const next = jest.fn();

    await getStarCamEvents(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });

  it('getStarCamMissions returns mission list payload', async () => {
    starCamService.listStarCamMissions.mockResolvedValue({
      items: [{ _id: 'm1', missionId: 'nature_01', missionImageUrl: '/mission.png' }],
    });
    const req = {
      user: { _id: 'parent-1' },
      query: { childId: 'child-1' },
    };
    const res = buildRes();
    const next = jest.fn();

    await getStarCamMissions(req, res, next);

    expect(starCamService.listStarCamMissions).toHaveBeenCalledWith({
      parentUserId: 'parent-1',
      childId: 'child-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
