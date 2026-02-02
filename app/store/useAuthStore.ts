/**
 * Rise Up Kids auth store
 * Placeholder for auth state - will be populated when auth is implemented
 */

import { create } from 'zustand';

export type UserRole = 'parent' | 'child';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
  }),
  logout: () => set({
    user: null,
    isAuthenticated: false,
  }),
}));
