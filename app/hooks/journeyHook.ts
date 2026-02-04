import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ChildCourseWithProgress,
  journeyService,
} from '@/services/journeyService';

/** Summary stats derived from course progress for journey-summary integration */
export interface JourneySummaryProgress {
  totalCourses: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  lockedCount: number;
  /** Average progress across all courses (0–100) */
  overallPercentage: number;
  /** Courses list for cards; progress embedded per item */
  coursesWithProgress: ChildCourseWithProgress[];
}

export interface UseJourneyState {
  loading: boolean;
  error: string | null;
  /** Course list with progress (for journey-cards) */
  coursesWithProgress: ChildCourseWithProgress[];
  /** Summary-ready progress (for journey-summary) */
  courseProgress: JourneySummaryProgress;
  refresh: () => Promise<void>;
}

const emptySummary: JourneySummaryProgress = {
  totalCourses: 0,
  completedCount: 0,
  inProgressCount: 0,
  notStartedCount: 0,
  lockedCount: 0,
  overallPercentage: 0,
  coursesWithProgress: [],
};

function deriveSummary(courses: ChildCourseWithProgress[]): JourneySummaryProgress {
  if (!courses.length) {
    return { ...emptySummary };
  }

  let completedCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;
  let lockedCount = 0;
  let totalPct = 0;

  for (const item of courses) {
    if (item.status === 'completed') completedCount++;
    else if (item.status === 'in_progress') inProgressCount++;
    else if (item.status === 'not_started') notStartedCount++;
    else lockedCount++;
    totalPct += item.progressPercentage ?? 0;
  }

  const overallPercentage =
    courses.length > 0 ? Math.round(totalPct / courses.length) : 0;

  return {
    totalCourses: courses.length,
    completedCount,
    inProgressCount,
    notStartedCount,
    lockedCount,
    overallPercentage,
    coursesWithProgress: courses,
  };
}

export function useJourney(childId: string | null | undefined): UseJourneyState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coursesWithProgress, setCoursesWithProgress] = useState<
    ChildCourseWithProgress[]
  >([]);

  const refresh = useCallback(async () => {
    if (!childId) {
      setCoursesWithProgress([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await journeyService.getChildCoursesWithProgress(childId);
      const list = res?.data ?? [];
      setCoursesWithProgress(list);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load journey courses'
      );
      setCoursesWithProgress([]);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const courseProgress = useMemo(
    () => deriveSummary(coursesWithProgress),
    [coursesWithProgress]
  );

  return useMemo(
    () => ({
      loading,
      error,
      coursesWithProgress,
      courseProgress,
      refresh,
    }),
    [loading, error, coursesWithProgress, courseProgress, refresh]
  );
}
