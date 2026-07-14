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

  hydrate: async () => {
    const [token, user] = await Promise.all([
      authService.getTokenFromStorage(),
      authService.getUserFromStorage(),
    ]);
    const authUser = user ? { ...user, id: user._id ?? user.id, _id: String(user._id ?? user.id) } as AuthUser : null;
    set({
      token,
      user: authUser,
      isAuthenticated: !!(token && authUser),
      isHydrated: true,
    });
  },
}));
