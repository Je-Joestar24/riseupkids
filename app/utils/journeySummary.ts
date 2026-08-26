import type { ChildCourseWithProgress } from '@/services/journeyService';

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

export const emptyJourneySummary: JourneySummaryProgress = {
  totalCourses: 0,
  completedCount: 0,
  inProgressCount: 0,
  notStartedCount: 0,
  lockedCount: 0,
  overallPercentage: 0,
  coursesWithProgress: [],
};

export function deriveJourneySummary(
  courses: ChildCourseWithProgress[]
): JourneySummaryProgress {
  if (!courses.length) {
    return { ...emptyJourneySummary };
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
