import { useCallback } from 'react';
import experienceChildService from '../services/experienceChildService';
import { EXPERIENCE_NOT_FOUND_MESSAGE } from '../utils/experienceChildFormat';
import { useCachedLoad } from './useCachedLoad';

/**
 * The published experiences for the child's list page.
 *
 * Cached per child for the session: only the first visit shows the placeholder; later visits draw the last
 * answer at once and replace it quietly (a failed refresh behind real content stays silent).
 *
 *   const { experiences, loading, error, retry } = useChildExperiences(childId);
 */
export function useChildExperiences(childId) {
  const { data, loaded, error, refresh } = useCachedLoad(
    childId ? `${childId}:experiences:list` : null,
    () => experienceChildService.getPublishedExperiences()
  );

  const retry = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return {
    experiences: data || [],
    loading: Boolean(childId) && !loaded && !error,
    error,
    retry,
  };
}

/**
 * One published experience for the detail page.
 *
 * Cached per child and experience for the session: only the first visit shows the placeholder, later visits draw the
 * last answer at once and replace it quietly. `notFound` is true when the server says this experience does not exist
 * or is not published (then there is nothing to try again).
 *
 *   const { experience, loading, error, notFound, retry } = useChildExperience(childId, uuid);
 */
export function useChildExperience(childId, uuid) {
  const { data, loaded, error, refresh } = useCachedLoad(
    childId && uuid ? `${childId}:experiences:detail:${uuid}` : null,
    () => experienceChildService.getPublishedExperience(uuid)
  );

  const retry = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const notFound = error === EXPERIENCE_NOT_FOUND_MESSAGE;

  return {
    experience: data || null,
    loading: Boolean(childId && uuid) && !loaded && !error,
    error: notFound ? null : error,
    notFound,
    retry,
  };
}

export default useChildExperiences;
