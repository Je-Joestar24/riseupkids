import { updateChildStats } from '../store/slices/userSlice';

export const CHILD_STATS_UPDATED_EVENT = 'childStatsUpdated';

function normalizeChildId(childId) {
  return childId != null ? String(childId) : '';
}

/**
 * Read the child's current total stars from sessionStorage.
 */
export function getChildTotalStars(childId) {
  const id = normalizeChildId(childId);
  if (!id) return 0;

  try {
    const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
    const child = childProfiles.find((profile) => normalizeChildId(profile._id) === id);
    if (child?.stats?.totalStars != null) {
      return Number(child.stats.totalStars) || 0;
    }

    const selectedChild = JSON.parse(sessionStorage.getItem('selectedChild') || 'null');
    if (selectedChild && normalizeChildId(selectedChild._id) === id) {
      return Number(selectedChild.stats?.totalStars) || 0;
    }
  } catch (error) {
    console.warn('[childStatsSync] Failed to read total stars from sessionStorage', error);
  }

  return 0;
}

/**
 * Persist total stars locally (sessionStorage + Redux) and notify listeners.
 * Does not call any API.
 */
export function syncChildTotalStars({ childId, totalStars, dispatch }) {
  const id = normalizeChildId(childId);
  if (!id || totalStars === undefined || totalStars === null) {
    return null;
  }

  const nextTotal = Number(totalStars) || 0;

  try {
    const childProfilesStr = sessionStorage.getItem('childProfiles');
    if (childProfilesStr) {
      const childProfiles = JSON.parse(childProfilesStr);
      const childIndex = childProfiles.findIndex(
        (profile) => normalizeChildId(profile._id) === id
      );

      if (childIndex !== -1) {
        childProfiles[childIndex].stats = childProfiles[childIndex].stats || {};
        childProfiles[childIndex].stats.totalStars = nextTotal;
        sessionStorage.setItem('childProfiles', JSON.stringify(childProfiles));
      }
    }

    const selectedChildStr = sessionStorage.getItem('selectedChild');
    if (selectedChildStr) {
      const selectedChild = JSON.parse(selectedChildStr);
      if (normalizeChildId(selectedChild._id) === id) {
        selectedChild.stats = selectedChild.stats || {};
        selectedChild.stats.totalStars = nextTotal;
        sessionStorage.setItem('selectedChild', JSON.stringify(selectedChild));
      }
    }

    if (dispatch) {
      dispatch(updateChildStats({
        childId,
        stats: { totalStars: nextTotal },
      }));
    }

    window.dispatchEvent(new CustomEvent(CHILD_STATS_UPDATED_EVENT, {
      detail: { childId: id, totalStars: nextTotal },
    }));

    return nextTotal;
  } catch (error) {
    console.error('[childStatsSync] Failed to sync child total stars', error);
    return null;
  }
}

/**
 * Apply a star reward from a book/video completion response without refetching stats.
 * Prefers API totalStars when provided; otherwise increments locally by starsToAward.
 */
export function applyStarRewardFromCompletion({
  childId,
  starsToAward = 0,
  totalStars,
  dispatch,
}) {
  const earnedThisSession = Number(starsToAward) || 0;
  const hasApiTotal = totalStars !== undefined && totalStars !== null;

  if (earnedThisSession <= 0 && !hasApiTotal) {
    return null;
  }

  const nextTotal = hasApiTotal
    ? Number(totalStars) || 0
    : getChildTotalStars(childId) + earnedThisSession;

  return syncChildTotalStars({ childId, totalStars: nextTotal, dispatch });
}
