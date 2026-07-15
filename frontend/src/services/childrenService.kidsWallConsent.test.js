import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../api/axios';
import childrenService from '../services/childrenService';

describe('childrenService.updateKidsWallConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('puts consent payload when enabling Kids Wall', async () => {
    api.put.mockResolvedValue({
      data: {
        success: true,
        message: 'Kids Wall enabled for this child',
        data: {
          _id: 'child1',
          kidsWallEnabled: true,
          kidsWallConsentAt: '2026-07-15T00:00:00.000Z',
        },
      },
    });

    const result = await childrenService.updateKidsWallConsent('child1', {
      enabled: true,
      consentAcknowledged: true,
    });

    expect(api.put).toHaveBeenCalledWith('/children/child1/kids-wall-consent', {
      enabled: true,
      consentAcknowledged: true,
    });
    expect(result.data.kidsWallEnabled).toBe(true);
  });

  it('puts disable payload without consent flag', async () => {
    api.put.mockResolvedValue({
      data: {
        success: true,
        data: { _id: 'child1', kidsWallEnabled: false },
      },
    });

    await childrenService.updateKidsWallConsent('child1', { enabled: false });

    expect(api.put).toHaveBeenCalledWith('/children/child1/kids-wall-consent', {
      enabled: false,
      consentAcknowledged: undefined,
    });
  });
});
