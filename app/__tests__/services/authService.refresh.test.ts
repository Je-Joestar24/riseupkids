/**
 * Chunk 9 Phase C — mobile refresh-token lifecycle (services/authService.ts).
 * Mirrors the intent of backend/tests/auth.mobileRefresh.e2e.test.js on the client side: the app
 * has no cookie jar, so it stores the refresh token itself (AsyncStorage, interim per Chunk 11)
 * and sends it explicitly to /auth/refresh, rotating it on every use.
 */
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

const { api } = jest.requireMock('@/services/api') as { api: { post: jest.Mock } };
const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage') as {
  setItem: jest.Mock;
  getItem: jest.Mock;
  multiRemove: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService.login', () => {
  it('stores both the access token and the refresh token from the response', async () => {
    api.post.mockResolvedValue({
      success: true,
      message: 'Login successful',
      data: {
        token: 'access-1',
        refreshToken: 'refresh-1',
        user: { _id: 'u1', email: 'p@example.com', role: 'parent' },
      },
    });

    await authService.login('p@example.com', 'secret123');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@riseupkids_token', 'access-1');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@riseupkids_refreshToken', 'refresh-1');
  });

  it('throws when the response has no token', async () => {
    api.post.mockResolvedValue({ success: true, message: '', data: {} });
    await expect(authService.login('p@example.com', 'secret123')).rejects.toThrow(
      'Invalid response from server'
    );
  });
});

describe('authService.refreshSession', () => {
  it('returns null without calling the API when there is no stored refresh token', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const result = await authService.refreshSession();

    expect(result).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('exchanges the stored refresh token and persists the new (rotated) tokens', async () => {
    AsyncStorage.getItem.mockResolvedValue('old-refresh-token');
    api.post.mockResolvedValue({
      success: true,
      data: { token: 'new-access', refreshToken: 'new-refresh' },
    });

    const result = await authService.refreshSession();

    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh-token' });
    expect(result).toBe('new-access');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@riseupkids_token', 'new-access');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@riseupkids_refreshToken', 'new-refresh');
  });

  it('clears local tokens and returns null when the refresh call fails (expired/revoked/reused)', async () => {
    AsyncStorage.getItem.mockResolvedValue('dead-refresh-token');
    api.post.mockRejectedValue(new Error('Session expired'));

    const result = await authService.refreshSession();

    expect(result).toBeNull();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      '@riseupkids_token',
      '@riseupkids_refreshToken',
    ]);
  });

  it('returns null and does not throw when the response has no token', async () => {
    AsyncStorage.getItem.mockResolvedValue('some-refresh-token');
    api.post.mockResolvedValue({ success: true, data: {} });

    const result = await authService.refreshSession();

    expect(result).toBeNull();
  });
});

describe('authService.getRefreshTokenFromStorage', () => {
  it('reads the refresh token key', async () => {
    AsyncStorage.getItem.mockResolvedValue('stored-token');
    const result = await authService.getRefreshTokenFromStorage();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@riseupkids_refreshToken');
    expect(result).toBe('stored-token');
  });
});
