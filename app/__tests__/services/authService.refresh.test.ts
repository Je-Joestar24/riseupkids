/**
 * Chunk 9 Phase C — mobile refresh-token lifecycle (services/authService.ts).
 * Mirrors the intent of backend/tests/auth.mobileRefresh.e2e.test.js on the client side: the app
 * has no cookie jar, so it stores the refresh token itself and sends it explicitly to
 * /auth/refresh, rotating it on every use.
 *
 * Chunk 11: the token/refreshToken now live in expo-secure-store, not AsyncStorage.
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

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const { api } = jest.requireMock('@/services/api') as { api: { post: jest.Mock } };
const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage') as {
  setItem: jest.Mock;
  getItem: jest.Mock;
  multiRemove: jest.Mock;
};
const SecureStore = jest.requireMock('expo-secure-store') as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  // No legacy plaintext session lying around in any of these tests.
  AsyncStorage.getItem.mockResolvedValue(null);
});

describe('authService.login', () => {
  it('stores both the access token and the refresh token in SecureStore, not AsyncStorage', async () => {
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

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_token', 'access-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_refreshToken', 'refresh-1');
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('@riseupkids_token', expect.anything());
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('@riseupkids_refreshToken', expect.anything());
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
    SecureStore.getItemAsync.mockResolvedValue(null);

    const result = await authService.refreshSession();

    expect(result).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('exchanges the stored refresh token and persists the new (rotated) tokens', async () => {
    SecureStore.getItemAsync.mockResolvedValue('old-refresh-token');
    api.post.mockResolvedValue({
      success: true,
      data: { token: 'new-access', refreshToken: 'new-refresh' },
    });

    const result = await authService.refreshSession();

    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh-token' });
    expect(result).toBe('new-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_token', 'new-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_refreshToken', 'new-refresh');
  });

  it('clears local tokens and returns null when the refresh call fails (expired/revoked/reused)', async () => {
    SecureStore.getItemAsync.mockResolvedValue('dead-refresh-token');
    api.post.mockRejectedValue(new Error('Session expired'));

    const result = await authService.refreshSession();

    expect(result).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('riseupkids_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('riseupkids_refreshToken');
  });

  it('returns null and does not throw when the response has no token', async () => {
    SecureStore.getItemAsync.mockResolvedValue('some-refresh-token');
    api.post.mockResolvedValue({ success: true, data: {} });

    const result = await authService.refreshSession();

    expect(result).toBeNull();
  });
});

describe('authService.getRefreshTokenFromStorage', () => {
  it('reads the refresh token from SecureStore', async () => {
    SecureStore.getItemAsync.mockResolvedValue('stored-token');
    const result = await authService.getRefreshTokenFromStorage();
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('riseupkids_refreshToken');
    expect(result).toBe('stored-token');
  });
});

describe('authService.migrateLegacyPlaintextSession', () => {
  it('does nothing when there is no legacy plaintext session', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    await authService.migrateLegacyPlaintextSession();

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
  });

  it('moves a legacy plaintext token/refreshToken/user into SecureStore and wipes the old copies', async () => {
    AsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === '@riseupkids_token') return Promise.resolve('legacy-access');
      if (key === '@riseupkids_refreshToken') return Promise.resolve('legacy-refresh');
      if (key === '@riseupkids_user') return Promise.resolve('{"_id":"u1"}');
      return Promise.resolve(null);
    });

    await authService.migrateLegacyPlaintextSession();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_token', 'legacy-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_refreshToken', 'legacy-refresh');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_user', '{"_id":"u1"}');
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      '@riseupkids_token',
      '@riseupkids_refreshToken',
      '@riseupkids_user',
    ]);
  });

  it('migrates a partial legacy session (e.g. only a token left over) without erroring', async () => {
    AsyncStorage.getItem.mockImplementation((key: string) =>
      Promise.resolve(key === '@riseupkids_token' ? 'legacy-access-only' : null)
    );

    await authService.migrateLegacyPlaintextSession();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_token', 'legacy-access-only');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('riseupkids_refreshToken', expect.anything());
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });
});
