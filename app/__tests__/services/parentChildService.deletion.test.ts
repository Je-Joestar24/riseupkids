import { parentChildService } from '@/services/parentChildService';

jest.mock('@/services/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

const { api } = jest.requireMock('@/services/api') as {
  api: { post: jest.Mock };
};

describe('parentChildService.requestChildDeletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts request-deletion with password and confirm text', async () => {
    api.post.mockResolvedValue({
      success: true,
      message: 'Child deletion requested',
      data: { childId: 'child-1', accessRevoked: true },
    });

    const result = await parentChildService.requestChildDeletion('child-1', {
      password: 'secret123',
      confirmText: 'DELETE',
    });

    expect(api.post).toHaveBeenCalledWith('/children/child-1/request-deletion', {
      password: 'secret123',
      confirmText: 'DELETE',
    });
    expect(result.success).toBe(true);
    expect(result.data?.accessRevoked).toBe(true);
  });
});
