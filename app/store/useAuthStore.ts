/**
 * Rise Up Kids Auth Store
 * Reactive auth state, hydrated from AsyncStorage
 */

import { create } from 'zustand';

import { authService } from '@/services/authService';

export type UserRole = 'parent' | 'child' | 'admin' | 'teacher';

export interface AuthUser {
  _id: string;
  id?: string;
  email: string;
  role: UserRole;
  name?: string;
  displayName?: string;
  [key: string]: unknown;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: AuthUser | null, token: string | null) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  /** Chunk 9 Phase C: silently exchange the stored refresh token for a new access token, and
   * keep this store's reactive state in sync with the result. Returns the new token, or null if
   * there was no valid session to renew (expired/revoked/never logged in). */
  refreshSession: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, token) => set({
    user,
    token,
    isAuthenticated: !!(user && token),
  }),

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      await authService.clearStorage();
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshSession: async () => {
    const newToken = await authService.refreshSession();
    if (newToken) {
      set({ token: newToken });
    } else {
      set({ user: null, token: null, isAuthenticated: false });
    }
    return newToken;
  },

  // Chunk 9 Phase C: a stored access token could be stale (app closed for hours/days), so
  // hydrate no longer just trusts it — it exchanges the stored refresh token for a fresh one
  // first (mirroring the web frontend's boot-time bootstrapSession()) and only considers the
  // user authenticated if that succeeds.
  hydrate: async () => {
    // Chunk 11: move any pre-existing plaintext session into SecureStore before reading it.
    await authService.migrateLegacyPlaintextSession();

    const [user, freshToken] = await Promise.all([
      authService.getUserFromStorage(),
      authService.refreshSession(),
    ]);

    if (freshToken && user) {
      const authUser = { ...user, id: user._id ?? user.id, _id: String(user._id ?? user.id) } as AuthUser;
      set({ token: freshToken, user: authUser, isAuthenticated: true, isHydrated: true });
    } else {
      await authService.clearStorage();
      set({ token: null, user: null, isAuthenticated: false, isHydrated: true });
    }
  },
}));
