/**
 * Chunk 10 Phase C — mobile two-factor login completion (services/authService.ts).
 * Mirrors frontend/src/services/authService.twoFactor.test.js's coverage of the same backend
 * endpoints, adapted to the mobile client's SecureStore-based session persistence (Chunk 11).
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
const SecureStore = jest.requireMock('expo-secure-store') as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService.login — two-factor challenge', () => {
  it('returns the requiresTwoFactor challenge without persisting anything', async () => {
    api.post.mockResolvedValue({
      success: true,
      message: 'Enter the code from your authenticator app to finish signing in.',
      data: { requiresTwoFactor: true, email: 'p@example.com' },
    });

    const result = await authService.login('p@example.com', 'secret123');

    expect(result.requiresTwoFactor).toBe(true);
    expect(result.email).toBe('p@example.com');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('still logs in directly when the account has no 2FA enabled', async () => {
    api.post.mockResolvedValue({
      success: true,
      message: 'Login successful',
      data: { token: 'access-1', user: { _id: 'u1', role: 'parent' } },
    });

    const result = await authService.login('p@example.com', 'secret123');

    expect(result.requiresTwoFactor).toBeUndefined();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_token', 'access-1');
  });
});

describe('authService.verifyLoginTwoFactor', () => {
  it('posts trimmed email + verbatim code and persists the returned session on success', async () => {
    api.post.mockResolvedValue({
      success: true,
      message: 'Login successful',
      data: {
        token: 'jwt-token',
        refreshToken: 'refresh-1',
        user: { _id: 'u1', email: 'p@example.com', role: 'parent' },
      },
    });

    const result = await authService.verifyLoginTwoFactor('  p@example.com  ', '123456');

    expect(api.post).toHaveBeenCalledWith('/auth/2fa/login-verify', {
      email: 'p@example.com',
      code: '123456',
    });
    expect(result.token).toBe('jwt-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_token', 'jwt-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('riseupkids_refreshToken', 'refresh-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'riseupkids_user',
      JSON.stringify({ _id: 'u1', email: 'p@example.com', role: 'parent' })
    );
  });

  it('sends a recovery code exactly as typed, without trimming or altering it', async () => {
    api.post.mockResolvedValue({ success: true, data: { token: 't' } });

    await authService.verifyLoginTwoFactor('p@example.com', 'ABCDE-12345');

    expect(api.post).toHaveBeenCalledWith('/auth/2fa/login-verify', {
      email: 'p@example.com',
      code: 'ABCDE-12345',
    });
  });

  it('throws and persists nothing when the code is rejected', async () => {
    api.post.mockRejectedValue(new Error('Invalid verification code'));

    await expect(authService.verifyLoginTwoFactor('p@example.com', '000000')).rejects.toThrow(
      'Invalid verification code'
    );
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('throws when the response is missing a token', async () => {
    api.post.mockResolvedValue({ success: true, data: {} });

    await expect(authService.verifyLoginTwoFactor('p@example.com', '123456')).rejects.toThrow(
      'Invalid response from server'
    );
  });
});
