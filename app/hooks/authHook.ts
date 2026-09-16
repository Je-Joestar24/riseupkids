/**
 * Rise Up Kids Auth Hook
 * Login, logout, auth state
 */

import { useCallback } from 'react';

import { useUI } from '@/hooks/uiHook';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationInboxStore } from '@/store/notificationInboxStore';
import { useParentChildStore } from '@/store/parentChildStore';
import { authService } from '@/services/authService';

import type { AuthUser } from '@/store/useAuthStore';
import type { LoginResponse } from '@/services/authService';

export function useAuth() {
  const { user, token, isAuthenticated, isHydrated, setAuth, logout: storeLogout } = useAuthStore();
  const { showSuccess, showError } = useUI();

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse['data']> => {
      try {
        const data = await authService.login(email, password);
        if (data.requiresTwoFactor) {
          return data;
        }
        const u = data.user as AuthUser;
        const authUser = u ? { ...u, id: u._id ?? u.id } as AuthUser : null;
        setAuth(authUser, data.token ?? null);
        showSuccess('Successful login');
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          showError('Network error. Please check your connection.');
        } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
          showError('Invalid credentials');
        } else {
          showError(msg || 'Login failed');
        }
        throw err;
      }
    },
    [setAuth, showSuccess, showError]
  );

  // Chunk 10 Phase C: completes a login that returned `requiresTwoFactor`. Errors are rethrown
  // (not shown via the global dialog) — a wrong code is a per-field validation error the screen
  // itself displays inline, not a dialog-worthy failure.
  const verifyLoginTwoFactor = useCallback(
    async (email: string, code: string): Promise<LoginResponse['data']> => {
      const data = await authService.verifyLoginTwoFactor(email, code);
      const u = data.user as AuthUser;
      const authUser = u ? { ...u, id: u._id ?? u.id } as AuthUser : null;
      setAuth(authUser, data.token ?? null);
      showSuccess('Successful login');
      return data;
    },
    [setAuth, showSuccess]
  );

  const logout = useCallback(async () => {
    await storeLogout();
    useParentChildStore.getState().reset();
    useNotificationInboxStore.getState().reset();
  }, [storeLogout]);

  const hydrate = useCallback(async () => {
    await useAuthStore.getState().hydrate();
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    isHydrated,
    login,
    verifyLoginTwoFactor,
    logout,
    hydrate,
  };
}
