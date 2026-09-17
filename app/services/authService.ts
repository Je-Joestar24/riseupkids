/**
 * Rise Up Kids Auth Service
 * Login, token storage via expo-secure-store (Keychain/Keystore) + AsyncStorage
 *
 * Chunk 9 Phase C — session hardening. The app has no browser-style cookie jar, so unlike the web
 * frontend (which moved the access token to memory-only and the refresh token to an httpOnly
 * cookie), the design here persists both tokens on-device and sends the refresh token explicitly,
 * tagged `X-Client-Platform: mobile` (see backend/config/refreshCookie.js for the server side of
 * this).
 *
 * Chunk 11 — the access token, refresh token, and cached user record (the actual session-identity
 * data) now live in expo-secure-store (iOS Keychain / Android Keystore) instead of plaintext
 * AsyncStorage. Cached display data that's just a convenience copy of something re-fetchable from
 * the API — child profiles, the parent record, which child is currently selected — stays in
 * AsyncStorage; it isn't a credential, and SecureStore has a practical per-item size limit that
 * makes it a poor fit for larger cached objects.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { api } from './api';

// Session-identity data — SecureStore. Key names may only contain alphanumerics, '.', '-', '_'.
const SECURE_KEYS = {
  token: 'riseupkids_token',
  refreshToken: 'riseupkids_refreshToken',
  user: 'riseupkids_user',
} as const;

// Where this same data lived before Chunk 11 — kept only so the one-time migration below can
// find and wipe any leftover plaintext copy on an app that's updating, not a fresh install.
const LEGACY_STORAGE_KEYS = {
  token: '@riseupkids_token',
  refreshToken: '@riseupkids_refreshToken',
  user: '@riseupkids_user',
} as const;

// Cached display data — AsyncStorage (see file header for why).
const STORAGE_KEYS = {
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
    token?: string;
    refreshToken?: string;
    user?: Record<string, unknown>;
    childProfiles?: unknown[];
    childProfile?: unknown;
    parent?: unknown;
    // Chunk 10 Phase C: present instead of a token when the account has TOTP enabled — the
    // caller must complete authService.verifyLoginTwoFactor() before a session exists.
    requiresTwoFactor?: boolean;
    email?: string;
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
  await SecureStore.setItemAsync(SECURE_KEYS.token, token);
  if (refreshToken) {
    await SecureStore.setItemAsync(SECURE_KEYS.refreshToken, refreshToken);
  }
};

const persistSession = async (payload: LoginResponse['data']): Promise<void> => {
  await persistTokens(payload.token as string, payload.refreshToken);
  if (payload.user) {
    await SecureStore.setItemAsync(SECURE_KEYS.user, JSON.stringify(payload.user));
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
};

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse['data']> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    // API returns { success, message, data: { user, token, refreshToken, childProfiles } }
    const payload = response.data;

    // Chunk 10 Phase C: an account with TOTP enabled returns this challenge instead of a
    // session — no token to persist yet, the caller must call verifyLoginTwoFactor() next.
    if (payload?.requiresTwoFactor) {
      return payload;
    }

    if (!payload?.token) {
      throw new Error('Invalid response from server');
    }

    await persistSession(payload);
    return payload;
  },

  /**
   * Chunk 10 Phase C: completes a login that returned `requiresTwoFactor`. `code` is either a
   * 6-digit TOTP code or a recovery code, sent verbatim — only the email is trimmed.
   */
  verifyLoginTwoFactor: async (email: string, code: string): Promise<LoginResponse['data']> => {
    const response = await api.post<LoginResponse>('/auth/2fa/login-verify', {
      email: email.trim(),
      code,
    });
    const payload = response.data;

    if (!payload?.token) {
      throw new Error('Invalid response from server');
    }

    await persistSession(payload);
    return payload;
  },

  getTokenFromStorage: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(SECURE_KEYS.token);
  },

  getRefreshTokenFromStorage: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
  },

  getUserFromStorage: async (): Promise<Record<string, unknown> | null> => {
    const raw = await SecureStore.getItemAsync(SECURE_KEYS.user);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  },

  clearStorage: async (): Promise<void> => {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.token),
      SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken),
      SecureStore.deleteItemAsync(SECURE_KEYS.user),
      AsyncStorage.multiRemove(Object.values(STORAGE_KEYS)),
    ]);
  },

  /**
   * One-time migration off the pre-Chunk-11 plaintext AsyncStorage session (token, refresh
   * token, cached user). A no-op on a fresh install or an app that's already migrated — just
   * three empty AsyncStorage reads. Must run before anything reads from SecureStore at boot.
   */
  migrateLegacyPlaintextSession: async (): Promise<void> => {
    const [legacyToken, legacyRefreshToken, legacyUser] = await Promise.all([
      AsyncStorage.getItem(LEGACY_STORAGE_KEYS.token),
      AsyncStorage.getItem(LEGACY_STORAGE_KEYS.refreshToken),
      AsyncStorage.getItem(LEGACY_STORAGE_KEYS.user),
    ]);

    if (!legacyToken && !legacyRefreshToken && !legacyUser) return;

    await Promise.all([
      legacyToken ? SecureStore.setItemAsync(SECURE_KEYS.token, legacyToken) : Promise.resolve(),
      legacyRefreshToken
        ? SecureStore.setItemAsync(SECURE_KEYS.refreshToken, legacyRefreshToken)
        : Promise.resolve(),
      legacyUser ? SecureStore.setItemAsync(SECURE_KEYS.user, legacyUser) : Promise.resolve(),
    ]);
    await AsyncStorage.multiRemove(Object.values(LEGACY_STORAGE_KEYS));
  },

  /**
   * Exchange the stored refresh token for a new access token (and a new refresh token — it
   * rotates on every use). Called on launch and on returning to foreground, and reactively by
   * api.ts on a 401. Returns null (never throws) when there's no valid session to renew — that's
   * a normal outcome (logged out, or the refresh token itself expired/was revoked elsewhere),
   * not an error.
   */
  refreshSession: async (): Promise<string | null> => {
    const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
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
      await Promise.all([
        SecureStore.deleteItemAsync(SECURE_KEYS.token),
        SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken),
      ]);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
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
