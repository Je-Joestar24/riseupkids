import { authService } from '@/services/authService';

jest.mock('@/services/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  multiRemove: jest.fn(),
}));

const { api } = jest.requireMock('@/services/api') as {
  api: { post: jest.Mock };
};
const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage') as {
  multiRemove: jest.Mock;
};

describe('authService.deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts delete-account payload and clears storage', async () => {
    api.post.mockResolvedValue({
      success: true,
      message: 'Deletion requested',
      data: { accessRevoked: true },
    });
    AsyncStorage.multiRemove.mockResolvedValue(undefined);

    const result = await authService.deleteAccount({
      password: 'secret123',
      confirmText: 'DELETE',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/delete-account', {
      password: 'secret123',
      confirmText: 'DELETE',
    });
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

describe('authService.logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts logout and clears storage', async () => {
    api.post.mockResolvedValue({ success: true });
    AsyncStorage.multiRemove.mockResolvedValue(undefined);

    await authService.logout();

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });

  it('still clears storage when logout API fails', async () => {
    api.post.mockRejectedValue(new Error('Network error'));
    AsyncStorage.multiRemove.mockResolvedValue(undefined);

    await authService.logout();

    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });
});
