/**
 * Rise Up Kids Auth Service
 * Login, token storage via AsyncStorage
 *
 * Chunk 9 Phase C — session hardening. The app has no browser-style cookie jar, so unlike the web
 * frontend (which moved the access token to memory-only and the refresh token to an httpOnly
 * cookie), the interim design here keeps BOTH tokens in AsyncStorage and sends the refresh token
 * explicitly, tagged `X-Client-Platform: mobile` (see backend/config/refreshCookie.js for the
 * server side of this). AsyncStorage is plaintext — a real secure-storage migration (Keychain/
 * Keystore via expo-secure-store) is tracked separately as Chunk 11; this chunk is only about the
 * refresh/rotation/revocation lifecycle, not where the bytes physically live.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from './api';

const STORAGE_KEYS = {
  token: '@riseupkids_token',
  refreshToken: '@riseupkids_refreshToken',
  user: '@riseupkids_user',
  childProfiles: '@riseupkids_childProfiles',
  childProfile: '@riseupkids_childProfile',
  parent: '@riseupkids_parent',
  selectedChildId: '@riseupkids_selectedChildId',
  selectedChild: '@riseupkids_selectedChild',
} as const;

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    refreshToken?: string;
    user: Record<string, unknown>;
    childProfiles?: unknown[];
    childProfile?: unknown;
    parent?: unknown;
  };
}

interface RefreshResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken?: string;
  };
}

const persistTokens = async (token: string, refreshToken?: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.token, token);
  if (refreshToken) {
    await AsyncStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  }
};

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse['data']> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    // API returns { success, message, data: { user, token, refreshToken, childProfiles } }
    const payload = response.data;

    if (!payload?.token) {
      throw new Error('Invalid response from server');
    }

    await persistTokens(payload.token, payload.refreshToken);
    if (payload.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(payload.user));
    }
    if (payload.childProfiles) {
      await AsyncStorage.setItem(STORAGE_KEYS.childProfiles, JSON.stringify(payload.childProfiles));
    }
    if (payload.childProfile) {
      await AsyncStorage.setItem(STORAGE_KEYS.childProfile, JSON.stringify(payload.childProfile));
    }
    if (payload.parent) {
      await AsyncStorage.setItem(STORAGE_KEYS.parent, JSON.stringify(payload.parent));
    }

    return payload;
  },

  getTokenFromStorage: async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_KEYS.token);
  },

  getRefreshTokenFromStorage: async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
  },

  getUserFromStorage: async (): Promise<Record<string, unknown> | null> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  },

  clearStorage: async (): Promise<void> => {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  },

  /**
   * Exchange the stored refresh token for a new access token (and a new refresh token — it
   * rotates on every use). Called on launch and on returning to foreground, and reactively by
   * api.ts on a 401. Returns null (never throws) when there's no valid session to renew — that's
   * a normal outcome (logged out, or the refresh token itself expired/was revoked elsewhere),
   * not an error.
   */
  refreshSession: async (): Promise<string | null> => {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!refreshToken) return null;

    try {
      const response = await api.post<RefreshResponse>('/auth/refresh', { refreshToken });
      const newToken = response.data?.token;
      if (!newToken) return null;
      await persistTokens(newToken, response.data?.refreshToken);
      return newToken;
    } catch {
      // Refresh token expired, revoked, or reused — no valid session. Clear local tokens so the
      // app doesn't keep retrying a dead refresh token; the user needs to log in again.
      await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.refreshToken]);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
      await api.post('/auth/logout', refreshToken ? { refreshToken } : undefined);
    } catch {
      // Still clear local session if the API call fails (offline, expired token, etc.)
    }
    await authService.clearStorage();
  },

  deleteAccount: async (payload: {
    password: string;
    confirmText: string;
  }): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data?: Record<string, unknown>;
    }>('/auth/delete-account', payload);
    await authService.clearStorage();
    return response;
  },
};
