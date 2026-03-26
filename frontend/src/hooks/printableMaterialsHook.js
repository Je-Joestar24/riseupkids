import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addCoursePrintable,
  clearCoursePrintablesState,
  clearPrintableManagementError,
  fetchCoursePrintables,
  fetchPrintableModules,
} from '../store/slices/printableManagementSlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Hook for admin printable materials management.
 */
export const usePrintableMaterials = () => {
  const dispatch = useDispatch();
  const {
    modules,
    modulesPagination,
    course,
    coursePrintables,
    coursePrintablesPagination,
    loadingModules,
    loadingCoursePrintables,
    addingPrintable,
    error,
  } = useSelector((state) => state.printableManagement);

  const loadModules = useCallback(
    async (params = {}) => {
      try {
        return await dispatch(fetchPrintableModules(params)).unwrap();
      } catch (err) {
        dispatch(
          showNotification({
            message: err || 'Failed to load modules',
            type: 'error',
          })
        );
        throw err;
      }
    },
    [dispatch]
  );

  const loadCoursePrintables = useCallback(
    async (courseId, params = {}) => {
      try {
        return await dispatch(fetchCoursePrintables({ courseId, params })).unwrap();
      } catch (err) {
        dispatch(
          showNotification({
            message: err || 'Failed to load printable materials',
            type: 'error',
          })
        );
        throw err;
      }
    },
    [dispatch]
  );

  const createCoursePrintable = useCallback(
    async (courseId, payload) => {
      try {
        const result = await dispatch(addCoursePrintable({ courseId, payload })).unwrap();
        dispatch(
          showNotification({
            message: 'Printable material added successfully!',
            type: 'success',
          })
        );
        return result;
      } catch (err) {
        dispatch(
          showNotification({
            message: err || 'Failed to add printable material',
            type: 'error',
          })
        );
        throw err;
      }
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearPrintableManagementError());
  }, [dispatch]);

  const clearCourseState = useCallback(() => {
    dispatch(clearCoursePrintablesState());
  }, [dispatch]);

  return {
    // state
    modules,
    modulesPagination,
    course,
    coursePrintables,
    coursePrintablesPagination,
    loadingModules,
    loadingCoursePrintables,
    addingPrintable,
    error,
    // actions
    loadModules,
    loadCoursePrintables,
    createCoursePrintable,
    clearError,
    clearCourseState,
  };
};

export default usePrintableMaterials;

