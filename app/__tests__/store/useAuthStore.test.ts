/**
 * Chunk 9 Phase C — useAuthStore's hydrate()/refreshSession() now go through a silent refresh
 * instead of just trusting whatever AsyncStorage happens to hold (which could be a stale/expired
 * access token after the app was closed for a while).
 */
jest.mock('@/services/authService', () => ({
  authService: {
    getUserFromStorage: jest.fn(),
    refreshSession: jest.fn(),
    clearStorage: jest.fn(),
    logout: jest.fn(),
    migrateLegacyPlaintextSession: jest.fn().mockResolvedValue(undefined),
  },
}));

import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

const mockAuthService = authService as jest.Mocked<typeof authService>;

const resetStore = () => {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isHydrated: false,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('hydrate', () => {
  it('Chunk 11: migrates any legacy plaintext session before reading storage', async () => {
    mockAuthService.getUserFromStorage.mockResolvedValue({ _id: 'u1', email: 'p@example.com', role: 'parent' });
    mockAuthService.refreshSession.mockResolvedValue('fresh-access-token');

    await useAuthStore.getState().hydrate();

    expect(mockAuthService.migrateLegacyPlaintextSession).toHaveBeenCalled();
  });

  it('a valid stored user + a successful silent refresh -> authenticated', async () => {
    mockAuthService.getUserFromStorage.mockResolvedValue({ _id: 'u1', email: 'p@example.com', role: 'parent' });
    mockAuthService.refreshSession.mockResolvedValue('fresh-access-token');

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('fresh-access-token');
    expect(state.user?._id).toBe('u1');
    expect(state.isHydrated).toBe(true);
    expect(mockAuthService.clearStorage).not.toHaveBeenCalled();
  });

  it('no valid refresh token (expired/revoked/never logged in) -> not authenticated, storage cleared', async () => {
    mockAuthService.getUserFromStorage.mockResolvedValue({ _id: 'u1', email: 'p@example.com', role: 'parent' });
    mockAuthService.refreshSession.mockResolvedValue(null);

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isHydrated).toBe(true);
    expect(mockAuthService.clearStorage).toHaveBeenCalled();
  });

  it('a successful refresh but no stored user -> not authenticated (defense in depth)', async () => {
    mockAuthService.getUserFromStorage.mockResolvedValue(null);
    mockAuthService.refreshSession.mockResolvedValue('fresh-access-token');

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('refreshSession', () => {
  it('updates the token in state on success, keeps isAuthenticated as-is otherwise unaffected', async () => {
    useAuthStore.setState({
      user: { _id: 'u1', email: 'p@example.com', role: 'parent' },
      token: 'old-token',
      isAuthenticated: true,
      isHydrated: true,
    });
    mockAuthService.refreshSession.mockResolvedValue('rotated-token');

    const result = await useAuthStore.getState().refreshSession();

    expect(result).toBe('rotated-token');
    expect(useAuthStore.getState().token).toBe('rotated-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('clears the session in state when the refresh fails — this is how a force-logout (admin revoke, password change elsewhere) reaches the app', async () => {
    useAuthStore.setState({
      user: { _id: 'u1', email: 'p@example.com', role: 'parent' },
      token: 'old-token',
      isAuthenticated: true,
      isHydrated: true,
    });
    mockAuthService.refreshSession.mockResolvedValue(null);

    const result = await useAuthStore.getState().refreshSession();

    expect(result).toBeNull();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});
