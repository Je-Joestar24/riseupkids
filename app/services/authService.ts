/**
 * Rise Up Kids Auth Service
 * Login, token storage via AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from './api';

const STORAGE_KEYS = {
  token: '@riseupkids_token',
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
    user: Record<string, unknown>;
    childProfiles?: unknown[];
    childProfile?: unknown;
    parent?: unknown;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse['data']> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    // API returns { success, message, data: { user, token, childProfiles } }
    const payload = response.data;

    if (!payload?.token) {
      throw new Error('Invalid response from server');
    }

    await AsyncStorage.setItem(STORAGE_KEYS.token, payload.token);
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

  getUserFromStorage: async (): Promise<Record<string, unknown> | null> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  },

  clearStorage: async (): Promise<void> => {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
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
