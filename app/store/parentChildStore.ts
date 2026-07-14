/**
 * Rise Up Kids Parent Child Store
 * Centralized state for children list, selected child, loading & error
 * Uses parentChildService for all API calls
 */

import { create } from 'zustand';

import { parentChildService } from '@/services/parentChildService';
import type {
  ChildProfile,
  CreateChildInput,
  UpdateChildInput,
  GetAllChildrenParams,
} from '@/services/parentChildService';

export interface ParentChildState {
  /** List of children for logged-in parent */
  children: ChildProfile[];
  /** Currently selected child (e.g. for switch-child flow) */
  selectedChild: ChildProfile | null;
  /** Loading state for list fetch */
  isLoading: boolean;
  /** Loading state for single-operation (create/update/delete) */
  isMutating: boolean;
  /** Error message to display */
  error: string | null;
}

export interface ParentChildActions {
  /** Fetch all children */
  fetchChildren: (params?: GetAllChildrenParams) => Promise<ChildProfile[]>;
  /** Fetch single child by ID */
  fetchChildById: (childId: string) => Promise<ChildProfile | null>;
  /** Create new child */
  createChild: (data: CreateChildInput) => Promise<ChildProfile | null>;
  /** Update child */
  updateChild: (childId: string, data: UpdateChildInput) => Promise<ChildProfile | null>;
  /** Request child profile deletion (self-service) */
  requestChildDeletion: (
    childId: string,
    payload: { password: string; confirmText: string }
  ) => Promise<boolean>;
  /** Set selected child (e.g. when parent switches) */
  setSelectedChild: (child: ChildProfile | null) => void;
  /** Clear error */
  clearError: () => void;
  /** Reset store (e.g. on logout) */
  reset: () => void;
}

const initialState: ParentChildState = {
  children: [],
  selectedChild: null,
  isLoading: false,
  isMutating: false,
  error: null,
};

export const useParentChildStore = create<ParentChildState & ParentChildActions>((set, get) => ({
  ...initialState,

  fetchChildren: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await parentChildService.getAllChildren(params ?? {});
      const list = res?.data ?? [];
      set({ children: list, isLoading: false });
      return list;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
      return [];
    }
  },

  fetchChildById: async (childId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await parentChildService.getChildById(childId);
      const child = res?.data ?? null;
      set({ isLoading: false });
      return child;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  createChild: async (data) => {
    set({ isMutating: true, error: null });
    try {
      const res = await parentChildService.createChild(data);
      const child = res?.data ?? null;
      if (child) {
        set((s) => ({ children: [child, ...s.children], isMutating: false }));
      } else {
        set({ isMutating: false });
      }
      return child;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isMutating: false });
      return null;
    }
  },

  updateChild: async (childId, data) => {
    set({ isMutating: true, error: null });
    try {
      const res = await parentChildService.updateChild(childId, data);
      const updated = res?.data ?? null;
      if (updated) {
        set((s) => ({
          children: s.children.map((c) => (c._id === childId ? updated : c)),
          selectedChild: s.selectedChild?._id === childId ? updated : s.selectedChild,
          isMutating: false,
        }));
      } else {
        set({ isMutating: false });
      }
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isMutating: false });
      return null;
    }
  },

  requestChildDeletion: async (childId, payload) => {
    set({ isMutating: true, error: null });
    try {
      const res = await parentChildService.requestChildDeletion(childId, payload);
      if (res?.success) {
        set((s) => ({
          children: s.children.filter((c) => c._id !== childId),
          selectedChild: s.selectedChild?._id === childId ? null : s.selectedChild,
          isMutating: false,
        }));
        return true;
      }
      set({ isMutating: false });
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isMutating: false });
      throw err;
    }
  },

  setSelectedChild: (child) => set({ selectedChild: child }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
