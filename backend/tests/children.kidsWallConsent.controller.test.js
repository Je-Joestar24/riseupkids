jest.mock('../services/kidsWallConsent.service', () => ({
  updateKidsWallConsent: jest.fn(),
}));

const kidsWallConsentService = require('../services/kidsWallConsent.service');
const { updateKidsWallConsent: updateKidsWallConsentController } = require('../controllers/children.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('children.controller updateKidsWallConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates consent for parent', async () => {
    kidsWallConsentService.updateKidsWallConsent.mockResolvedValue({
      _id: 'child1',
      displayName: 'Alex',
      kidsWallEnabled: true,
      kidsWallConsentAt: '2026-07-15T00:00:00.000Z',
    });

    const req = {
      params: { id: 'child1' },
      user: { _id: 'parent1', role: 'parent' },
      body: { enabled: true, consentAcknowledged: true },
    };
    const res = mockRes();

    await updateKidsWallConsentController(req, res);

    expect(kidsWallConsentService.updateKidsWallConsent).toHaveBeenCalledWith(
      'child1',
      'parent1',
      { enabled: true, consentAcknowledged: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ kidsWallEnabled: true }),
      })
    );
  });

  it('returns 403 for non-parent role', async () => {
    const req = {
      params: { id: 'child1' },
      user: { _id: 'admin1', role: 'admin' },
      body: { enabled: true, consentAcknowledged: true },
    };
    const res = mockRes();

    await updateKidsWallConsentController(req, res);

    expect(kidsWallConsentService.updateKidsWallConsent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
