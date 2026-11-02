/**
 * Journey Store
 *
 * Session cache for My Journey courses-with-progress, keyed by childId.
 * Stale-while-revalidate: cached cards render immediately; refresh does not
 * flash the skeleton when a list already exists.
 */

import { create } from 'zustand';

import { API_BASE_URL } from '@/config';
import { prefetchImages } from '@/utils/remoteImage';
import {
  type ChildCourseWithProgress,
  journeyService,
} from '@/services/journeyService';

const inflightByChildId = new Map<string, Promise<ChildCourseWithProgress[]>>();

function journeyCoverUrl(course: ChildCourseWithProgress['course'] | undefined): string | null {
  if (!course) return null;
  const path =
    (typeof course.coverImagePath === 'string' && course.coverImagePath) ||
    (typeof (course as { coverImage?: string }).coverImage === 'string'
      ? (course as { coverImage?: string }).coverImage
      : null);
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Only the covers at the top are fetched ahead of time; the rest load as their cards are shown. */
function prefetchJourneyCovers(courses: ChildCourseWithProgress[]): void {
  prefetchImages(courses.map((item) => journeyCoverUrl(item.course)));
}

export interface JourneyState {
  coursesByChildId: Record<string, ChildCourseWithProgress[]>;
  loadingByChildId: Record<string, boolean>;
  errorByChildId: Record<string, string | null>;
}

export interface JourneyActions {
  fetchChildCourses: (
    childId: string,
    options?: { silent?: boolean }
  ) => Promise<ChildCourseWithProgress[]>;
  prefetchChildCourses: (childId: string) => void;
}

const initialState: JourneyState = {
  coursesByChildId: {},
  loadingByChildId: {},
  errorByChildId: {},
};

export const useJourneyStore = create<JourneyState & JourneyActions>((set, get) => ({
  ...initialState,

  fetchChildCourses: async (childId, options = {}) => {
    if (!childId) return [];

    const existingInflight = inflightByChildId.get(childId);
    if (existingInflight) return existingInflight;

    const hasCache = get().coursesByChildId[childId] !== undefined;
    const showLoading = !options.silent && !hasCache;

    if (showLoading) {
      set((s) => ({
        loadingByChildId: { ...s.loadingByChildId, [childId]: true },
        errorByChildId: { ...s.errorByChildId, [childId]: null },
      }));
    } else {
      set((s) => ({
        errorByChildId: { ...s.errorByChildId, [childId]: null },
      }));
    }

    const request = (async () => {
      try {
        const res = await journeyService.getChildCoursesWithProgress(childId);
        const list = Array.isArray(res?.data) ? res.data : [];
        set((s) => ({
          coursesByChildId: { ...s.coursesByChildId, [childId]: list },
          loadingByChildId: { ...s.loadingByChildId, [childId]: false },
          errorByChildId: { ...s.errorByChildId, [childId]: null },
        }));
        prefetchJourneyCovers(list);
        return list;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to load journey courses';
        set((s) => ({
          loadingByChildId: { ...s.loadingByChildId, [childId]: false },
          errorByChildId: { ...s.errorByChildId, [childId]: msg },
        }));
        return get().coursesByChildId[childId] ?? [];
      } finally {
        inflightByChildId.delete(childId);
      }
    })();

    inflightByChildId.set(childId, request);
    return request;
  },

  prefetchChildCourses: (childId) => {
    if (!childId) return;
    if (get().coursesByChildId[childId] !== undefined) return;
    if (inflightByChildId.has(childId)) return;
    void get().fetchChildCourses(childId);
  },
}));
