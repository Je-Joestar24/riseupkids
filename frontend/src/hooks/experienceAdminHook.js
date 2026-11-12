import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearExperienceFilters,
  deleteExperience,
  fetchExperiences,
  publishExperience,
  selectExperienceAdmin,
  setExperienceFilters,
  unpublishExperience,
} from '../store/slices/experienceAdminSlice';
import { showNotification } from '../store/slices/uiSlice';
import { EXPERIENCE_ERROR_CODES } from '../services/experienceAdminService';

const titleOf = (experience) => `"${experience?.title || 'this experience'}"`;

/** The reasons the backend gives for a blocked publish, as one readable line. */
const withReasons = (error) => {
  const reasons = (error.errors || []).map((item) => item.message).filter(Boolean);
  return reasons.length ? `${error.message} ${reasons.join(' ')}` : error.message;
};

/**
 * Admin Experiences list: the state, the filters and the row actions (publish, unpublish, delete).
 * Every action tells the admin what happened, and refreshes the list so the rows, the counts and the
 * paging always match the server.
 */
const useExperienceAdmin = () => {
  const dispatch = useDispatch();
  const state = useSelector(selectExperienceAdmin);

  // Row actions finish later; they must reload with the filters as they are THEN, not when they started.
  const latestFilters = useRef(state.filters);
  latestFilters.current = state.filters;

  const notify = useCallback((message, type) => dispatch(showNotification({ message, type })), [dispatch]);

  const loadExperiences = useCallback((filters) => dispatch(fetchExperiences(filters)), [dispatch]);
  const reload = useCallback(() => dispatch(fetchExperiences(latestFilters.current)), [dispatch]);

  const updateFilters = useCallback((partial) => dispatch(setExperienceFilters(partial)), [dispatch]);
  const clearFilters = useCallback(() => dispatch(clearExperienceFilters()), [dispatch]);

  /**
   * Shows or hides an experience for children.
   * @returns {Promise<{ ok: boolean, code?: string|null }>}
   */
  const setPublished = useCallback(
    async (experience, publish) => {
      const thunk = publish ? publishExperience : unpublishExperience;
      const result = await dispatch(thunk(experience.uuid));
      if (thunk.fulfilled.match(result)) {
        notify(
          publish ? `${titleOf(experience)} is now visible to children.` : `${titleOf(experience)} is now hidden from children.`,
          'success'
        );
        reload();
        return { ok: true };
      }
      const error = result.payload || {};
      if (error.code === EXPERIENCE_ERROR_CODES.NOT_FOUND) {
        notify('This experience no longer exists (someone else may have deleted it). The list was refreshed.', 'warning');
        reload();
      } else if (error.code === EXPERIENCE_ERROR_CODES.PUBLISH_BLOCKED) {
        notify(withReasons(error), 'warning');
      } else {
        notify(error.message || 'Something went wrong. Please try again.', 'error');
      }
      return { ok: false, code: error.code || null };
    },
    [dispatch, notify, reload]
  );

  /**
   * Deletes for good. An experience that is already gone counts as deleted: that is what was asked.
   * @returns {Promise<{ ok: boolean, code?: string|null }>}
   */
  const remove = useCallback(
    async (experience) => {
      const result = await dispatch(deleteExperience(experience.uuid));
      if (deleteExperience.fulfilled.match(result)) {
        notify(`${titleOf(experience)} was deleted.`, 'success');
        reload();
        return { ok: true };
      }
      const error = result.payload || {};
      if (error.code === EXPERIENCE_ERROR_CODES.NOT_FOUND) {
        notify(`${titleOf(experience)} was already deleted. The list was refreshed.`, 'warning');
        reload();
        return { ok: true, code: error.code };
      }
      notify(error.message || 'Could not delete the experience. Please try again.', 'error');
      return { ok: false, code: error.code || null };
    },
    [dispatch, notify, reload]
  );

  return {
    items: state.items,
    pagination: state.pagination,
    counts: state.counts,
    filters: state.filters,
    loaded: state.loaded,
    loading: state.loading,
    error: state.error,
    busy: state.busy,
    loadExperiences,
    reload,
    updateFilters,
    clearFilters,
    setPublished,
    remove,
  };
};

export default useExperienceAdmin;
