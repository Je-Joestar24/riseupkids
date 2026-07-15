import { parentChildService } from '@/services/parentChildService';

jest.mock('@/services/api', () => ({
  api: {
    put: jest.fn(),
  },
}));

const { api } = jest.requireMock('@/services/api') as {
  api: { put: jest.Mock };
};

describe('parentChildService.updateKidsWallConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('puts kids-wall-consent when enabling', async () => {
    api.put.mockResolvedValue({
      success: true,
      data: {
        _id: 'child-1',
        kidsWallEnabled: true,
        kidsWallConsentAt: '2026-07-15T00:00:00.000Z',
      },
    });

    const result = await parentChildService.updateKidsWallConsent('child-1', {
      enabled: true,
      consentAcknowledged: true,
    });

    expect(api.put).toHaveBeenCalledWith('/children/child-1/kids-wall-consent', {
      enabled: true,
      consentAcknowledged: true,
    });
    expect(result.data?.kidsWallEnabled).toBe(true);
  });
});
