/**
 * Global network connectivity store.
 * Opens one app-wide "no internet" modal; does not import the Axios client
 * (ping uses fetch) so interceptors cannot recurse.
 */

import { create } from 'zustand';

import { API_BASE_URL } from '@/config';
import { pingApiHealth } from '@/utils/networkError';

const NAV_CHECK_COOLDOWN_MS = 8000;

export interface NetworkState {
  modalOpen: boolean;
  checking: boolean;
  reconnectGeneration: number;
  lastCheckAt: number;
}

export interface NetworkActions {
  reportOffline: () => void;
  checkOnNavigate: () => Promise<void>;
  retry: () => Promise<boolean>;
}

export const useNetworkStore = create<NetworkState & NetworkActions>((set, get) => ({
  modalOpen: false,
  checking: false,
  reconnectGeneration: 0,
  lastCheckAt: 0,

  reportOffline: () => {
    if (get().modalOpen) return;
    set({ modalOpen: true });
  },

  checkOnNavigate: async () => {
    if (get().modalOpen || get().checking) return;
    const now = Date.now();
    if (now - get().lastCheckAt < NAV_CHECK_COOLDOWN_MS) return;
    set({ checking: true, lastCheckAt: now });
    const ok = await pingApiHealth(fetch, API_BASE_URL);
    if (ok) {
      set({ checking: false });
      return;
    }
    set({ checking: false, modalOpen: true });
  },

  retry: async () => {
    set({ checking: true });
    const ok = await pingApiHealth(fetch, API_BASE_URL);
    if (!ok) {
      set({ checking: false, modalOpen: true });
      return false;
    }
    set((s) => ({
      checking: false,
      modalOpen: false,
      reconnectGeneration: s.reconnectGeneration + 1,
    }));
    return true;
  },
}));
