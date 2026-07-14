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
import authService from '../services/authService';

describe('authService.deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts password and confirmText to delete-account endpoint', async () => {
    api.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Your account access has been revoked.',
        data: { accessRevoked: true },
      },
    });

    const result = await authService.deleteAccount({
      password: 'secret123',
      confirmText: 'DELETE',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/delete-account', {
      password: 'secret123',
      confirmText: 'DELETE',
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('revoked');
  });

  it('throws API error message on failure', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Password is incorrect' } },
    });

    await expect(
      authService.deleteAccount({ password: 'bad', confirmText: 'DELETE' })
    ).rejects.toEqual({ message: 'Password is incorrect' });
  });
});
