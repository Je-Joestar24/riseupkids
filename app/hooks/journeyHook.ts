import { useCallback, useEffect, useMemo } from 'react';

import type { ChildCourseWithProgress } from '@/services/journeyService';
import { useJourneyStore } from '@/store/journeyStore';
import { useOnNetworkReconnect } from '@/hooks/useOnNetworkReconnect';
import {
  deriveJourneySummary,
  type JourneySummaryProgress,
} from '@/utils/journeySummary';

export type { JourneySummaryProgress };

/** Stable empty list so Zustand getSnapshot does not return a new [] every render. */
const EMPTY_COURSES: ChildCourseWithProgress[] = [];

export interface UseJourneyState {
  loading: boolean;
  error: string | null;
  /** Course list with progress (for journey-cards) */
  coursesWithProgress: ChildCourseWithProgress[];
  /** Summary-ready progress (for journey-summary) */
  courseProgress: JourneySummaryProgress;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

export function useJourney(childId: string | null | undefined): UseJourneyState {
  const cachedCourses = useJourneyStore((s) =>
    childId ? s.coursesByChildId[childId] : undefined
  );
  const coursesWithProgress = cachedCourses ?? EMPTY_COURSES;
  const hasCache = cachedCourses !== undefined;
  const storeLoading = useJourneyStore((s) =>
    childId ? s.loadingByChildId[childId] === true : false
  );
  const error = useJourneyStore((s) =>
    childId ? (s.errorByChildId[childId] ?? null) : null
  );
  const fetchChildCourses = useJourneyStore((s) => s.fetchChildCourses);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!childId) return;
      const cached =
        useJourneyStore.getState().coursesByChildId[childId] !== undefined;
      await fetchChildCourses(childId, {
        silent: options?.silent ?? cached,
      });
    },
    [childId, fetchChildCourses]
  );

  useEffect(() => {
    if (!childId) return;
    const cached =
      useJourneyStore.getState().coursesByChildId[childId] !== undefined;
    if (cached) return;
    void fetchChildCourses(childId);
  }, [childId, fetchChildCourses]);

  useOnNetworkReconnect(() => {
    if (!childId) return;
    const cached =
      useJourneyStore.getState().coursesByChildId[childId] !== undefined;
    void fetchChildCourses(childId, { silent: cached });
  });

  const courseProgress = useMemo(
    () => deriveJourneySummary(coursesWithProgress),
    [coursesWithProgress]
  );

  return useMemo(
    () => ({
      loading: storeLoading && !hasCache,
      error,
      coursesWithProgress,
      courseProgress,
      refresh,
    }),
    [storeLoading, hasCache, error, coursesWithProgress, courseProgress, refresh]
  );
}
