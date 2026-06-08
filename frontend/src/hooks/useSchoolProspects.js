import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSchoolProspects,
  setSchoolProspectFilters,
  setSchoolProspectPage,
  clearSchoolProspectsError,
} from '../store/slices/schoolProspectsSlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Admin hook for school prospect list (pagination + search).
 */
export const useSchoolProspects = () => {
  const dispatch = useDispatch();
  const { items, meta, filters, loading, error } = useSelector((state) => state.schoolProspects);

  const loadSchoolProspects = useCallback(
    async (params = null) => {
      const query = params || filters;
      const cleanParams = Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== '' && value != null)
      );

      try {
        return await dispatch(fetchSchoolProspects(cleanParams)).unwrap();
      } catch (err) {
        dispatch(
          showNotification({
            message: err || 'Failed to load school prospects',
            type: 'error',
          })
        );
        throw err;
      }
    },
    [dispatch, filters]
  );

  const updateFilters = useCallback(
    (partial) => {
      dispatch(setSchoolProspectFilters({ ...partial, page: 1 }));
    },
    [dispatch]
  );

  const goToPage = useCallback(
    (page) => {
      dispatch(setSchoolProspectPage(page));
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearSchoolProspectsError());
  }, [dispatch]);

  return {
    items,
    meta,
    filters,
    loading,
    error,
    loadSchoolProspects,
    updateFilters,
    goToPage,
    clearError,
  };
};

export default useSchoolProspects;
