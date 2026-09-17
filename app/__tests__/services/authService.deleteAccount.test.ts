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

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const { api } = jest.requireMock('@/services/api') as {
  api: { post: jest.Mock };
};
const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage') as {
  multiRemove: jest.Mock;
};
const SecureStore = jest.requireMock('expo-secure-store') as {
  getItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
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
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('riseupkids_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('riseupkids_refreshToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('riseupkids_user');
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

describe('authService.logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts logout with no body when there is no stored refresh token, and clears storage', async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);
    api.post.mockResolvedValue({ success: true });
    AsyncStorage.multiRemove.mockResolvedValue(undefined);

    await authService.logout();

    expect(api.post).toHaveBeenCalledWith('/auth/logout', undefined);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('riseupkids_token');
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });

  it('posts the stored refresh token in the body (Chunk 9 — mobile has no cookie jar)', async () => {
    SecureStore.getItemAsync.mockResolvedValue('stored-refresh-token');
    api.post.mockResolvedValue({ success: true });
    AsyncStorage.multiRemove.mockResolvedValue(undefined);

    await authService.logout();

    expect(api.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'stored-refresh-token' });
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });

  it('still clears storage when logout API fails', async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);
    api.post.mockRejectedValue(new Error('Network error'));
    AsyncStorage.multiRemove.mockResolvedValue(undefined);

    await authService.logout();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('riseupkids_token');
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });
});
