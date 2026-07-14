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

describe('childrenService.requestChildDeletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to request-deletion with credentials', async () => {
    api.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Access revoked.',
        data: { childId: 'child1', accessRevoked: true },
      },
    });

    const result = await childrenService.requestChildDeletion('child1', {
      password: 'secret123',
      confirmText: 'DELETE',
    });

    expect(api.post).toHaveBeenCalledWith('/children/child1/request-deletion', {
      password: 'secret123',
      confirmText: 'DELETE',
    });
    expect(result.data.accessRevoked).toBe(true);
  });

  it('throws API error payload on failure', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Please type DELETE to confirm deletion' } },
    });

    await expect(
      childrenService.requestChildDeletion('child1', {
        password: 'secret123',
        confirmText: 'REMOVE',
      })
    ).rejects.toEqual({ message: 'Please type DELETE to confirm deletion' });
  });
});
