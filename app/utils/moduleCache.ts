import type { ModuleDetailsPayload } from '@/services/moduleService';

/** Session cache key for one child's view of one course. */
export function moduleCacheKey(childId: string, courseId: string): string {
  return `${childId}:${courseId}`;
}

/**
 * Pick details for the course currently on screen.
 * Prefer live store details when they already match; otherwise use the cache
 * so the first paint after navigation is not the previous course.
 */
export function pickModuleDetailsForCourse(
  details: ModuleDetailsPayload | null,
  detailsByKey: Record<string, ModuleDetailsPayload>,
  childId: string | null | undefined,
  courseId: string | null | undefined
): ModuleDetailsPayload | null {
  if (!childId || !courseId) return details;
  const key = moduleCacheKey(String(childId), String(courseId));
  const cached = detailsByKey[key];
  const currentId = details?.course?._id;
  if (currentId != null && String(currentId) === String(courseId)) {
    return details;
  }
  return cached ?? null;
}

/** Skeleton only when there is nothing to show yet. */
export function shouldShowModuleLoading(
  hasCachedDetails: boolean,
  options?: { silent?: boolean }
): boolean {
  if (options?.silent) return false;
  return !hasCachedDetails;
}
