/**
 * Rise Up Kids Parent Child Service
 * Handles all children-related API calls (parent use only)
 * Mirrors frontend/src/services/childrenService.js pattern
 */

import { api } from './api';

/** API response wrapper - backend returns { success, message, data, count? } */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  count?: number;
}

/** Child preferences */
export interface ChildPreferences {
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  soundEnabled?: boolean;
}

/** Child profile as returned by API */
export interface ChildProfile {
  _id: string;
  displayName: string;
  age?: number;
  avatar?: string | null;
  currentJourney?: { _id: string; title?: string; description?: string; order?: number } | null;
  currentLesson?: { _id: string; title?: string; description?: string; order?: number } | null;
  preferences?: ChildPreferences;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    totalStars?: number;
    currentStreak?: number;
    totalBadges?: number;
    badges?: unknown[];
    level?: string;
    nextLevel?: string;
    starsNeededForNextLevel?: number;
  };
}

/** Input for creating a child */
export interface CreateChildInput {
  displayName: string;
  age?: number;
  avatar?: string | null;
  currentJourney?: string | null;
  currentLesson?: string | null;
  preferences?: Partial<ChildPreferences>;
}

/** Input for updating a child (all fields optional) */
export interface UpdateChildInput {
  displayName?: string;
  age?: number;
  avatar?: string | null;
  currentJourney?: string | null;
  currentLesson?: string | null;
  preferences?: Partial<ChildPreferences>;
  isActive?: boolean;
}

/** Query params for getAllChildren */
export interface GetAllChildrenParams {
  isActive?: boolean;
}

/**
 * Parent Child Service
 * Centralized API layer for child profiles - reusable across screens
 */
export const parentChildService = {
  /**
   * Get all children of logged-in parent
   */
  getAllChildren: async (params: GetAllChildrenParams = {}): Promise<ApiResponse<ChildProfile[]>> => {
    const response = await api.get<ApiResponse<ChildProfile[]>>('/children', { params });
    return response as ApiResponse<ChildProfile[]>;
  },

  /**
   * Get single child by ID
   */
  getChildById: async (childId: string): Promise<ApiResponse<ChildProfile>> => {
    const response = await api.get<ApiResponse<ChildProfile>>(`/children/${childId}`);
    return response as ApiResponse<ChildProfile>;
  },

  /**
   * Create new child profile
   */
  createChild: async (childData: CreateChildInput): Promise<ApiResponse<ChildProfile>> => {
    const response = await api.post<ApiResponse<ChildProfile>>('/children', childData);
    return response as ApiResponse<ChildProfile>;
  },

  /**
   * Update child profile
   */
  updateChild: async (
    childId: string,
    updateData: UpdateChildInput
  ): Promise<ApiResponse<ChildProfile>> => {
    const response = await api.put<ApiResponse<ChildProfile>>(`/children/${childId}`, updateData);
    return response as ApiResponse<ChildProfile>;
  },

  /**
   * Delete child profile (soft delete)
   */
  deleteChild: async (childId: string): Promise<ApiResponse<ChildProfile>> => {
    const response = await api.delete<ApiResponse<ChildProfile>>(`/children/${childId}`);
    return response as ApiResponse<ChildProfile>;
  },

  /**
   * Restore archived child profile
   */
  restoreChild: async (childId: string): Promise<ApiResponse<ChildProfile>> => {
    const response = await api.put<ApiResponse<ChildProfile>>(`/children/${childId}/restore`);
    return response as ApiResponse<ChildProfile>;
  },

  /**
   * Get child profile with full stats, badges, and level info
   */
  getChildProfile: async (childId: string): Promise<ApiResponse<ChildProfile>> => {
    const response = await api.get<ApiResponse<ChildProfile>>(`/children/${childId}/profile`);
    return response as ApiResponse<ChildProfile>;
  },
};
