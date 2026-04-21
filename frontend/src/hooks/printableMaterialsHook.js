import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addCoursePrintable,
  clearCoursePrintablesState,
  clearPrintableManagementError,
  deleteCoursePrintable,
  fetchCoursePrintables,
  fetchPrintableModules,
  updateCoursePrintable,
} from '../store/slices/printableManagementSlice';
import { showConfirmationDialog, showNotification } from '../store/slices/uiSlice';

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
    updatingPrintable,
    deletingPrintable,
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

  const editCoursePrintable = useCallback(
    async (courseId, printableId, payload) => {
      try {
        const result = await dispatch(updateCoursePrintable({ courseId, printableId, payload })).unwrap();
        dispatch(
          showNotification({
            message: 'Printable material updated successfully!',
            type: 'success',
          })
        );
        return result;
      } catch (err) {
        dispatch(
          showNotification({
            message: err || 'Failed to update printable material',
            type: 'error',
          })
        );
        throw err;
      }
    },
    [dispatch]
  );

  const requestDeleteCoursePrintable = useCallback(
    ({ courseId, printable, onDeleted }) => {
      if (!courseId || !printable?.id) return;

      dispatch(
        showConfirmationDialog({
          title: 'Delete Printable Material',
          message: `Are you sure you want to delete "${printable.title || 'this printable'}"? This action cannot be undone.`,
          type: 'warning',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          onConfirm: async () => {
            try {
              await dispatch(
                deleteCoursePrintable({
                  courseId,
                  printableId: printable.id,
                })
              ).unwrap();
              dispatch(
                showNotification({
                  message: 'Printable material deleted successfully.',
                  type: 'success',
                })
              );
              if (typeof onDeleted === 'function') {
                await onDeleted();
              }
            } catch (err) {
              dispatch(
                showNotification({
                  message: err || 'Failed to delete printable material',
                  type: 'error',
                })
              );
            }
          },
        })
      );
    },
    [dispatch]
  );

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
    updatingPrintable,
    deletingPrintable,
    error,
    // actions
    loadModules,
    loadCoursePrintables,
    createCoursePrintable,
    editCoursePrintable,
    requestDeleteCoursePrintable,
    clearError,
    clearCourseState,
  };
};

export default usePrintableMaterials;

