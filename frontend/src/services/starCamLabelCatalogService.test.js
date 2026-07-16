import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

import api from '../api/axios';
import starCamLabelCatalogService from './starCamLabelCatalogService';

describe('starCamLabelCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listManagedLabels calls GET /labels', async () => {
    api.get.mockResolvedValue({
      data: { data: { page: 1, limit: 25, total: 1, items: [{ labelId: 'custom:book', displayName: 'Book' }] } },
    });

    const result = await starCamLabelCatalogService.listManagedLabels({ page: 1, search: 'book' });

    expect(api.get).toHaveBeenCalledWith('/admin/star-cam/label-catalog/labels', {
      params: { page: 1, limit: 25, search: 'book' },
      signal: undefined,
    });
    expect(result.items).toHaveLength(1);
  });

  it('updateLabelAvailability calls PATCH availability endpoint', async () => {
    api.patch.mockResolvedValue({ data: { data: { labelId: 'custom:book', isAvailableForMissions: true } } });

    const result = await starCamLabelCatalogService.updateLabelAvailability('custom:book', true);

    expect(api.patch).toHaveBeenCalledWith('/admin/star-cam/label-catalog/labels/custom%3Abook/availability', {
      isAvailableForMissions: true,
    });
    expect(result.isAvailableForMissions).toBe(true);
  });

  it('bulkUpdateLabelAvailability calls POST bulk endpoint', async () => {
    api.post.mockResolvedValue({ data: { data: { matched: 2, modified: 2 } } });

    const result = await starCamLabelCatalogService.bulkUpdateLabelAvailability({
      labelIds: ['custom:book', 'custom:chair'],
      isAvailableForMissions: true,
    });

    expect(api.post).toHaveBeenCalledWith('/admin/star-cam/label-catalog/labels/bulk-availability', {
      labelIds: ['custom:book', 'custom:chair'],
      isAvailableForMissions: true,
      selectAllMatching: undefined,
      search: undefined,
    });
    expect(result.modified).toBe(2);
  });
});
