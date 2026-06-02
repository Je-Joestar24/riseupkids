import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addCourseLessonPlan,
  clearCourseLessonPlansState,
  clearLessonPlanManagementError,
  deleteCourseLessonPlan,
  fetchCourseLessonPlans,
  fetchLessonPlanModules,
  updateCourseLessonPlan,
} from '../store/slices/lessonPlanManagementSlice';
import { showConfirmationDialog, showNotification } from '../store/slices/uiSlice';

export const useLessonPlanMaterials = () => {
  const dispatch = useDispatch();
  const {
    modules,
    modulesPagination,
    course,
    courseLessonPlans,
    courseLessonPlansPagination,
    loadingModules,
    loadingCourseLessonPlans,
    addingLessonPlan,
    updatingLessonPlan,
    deletingLessonPlan,
    error,
  } = useSelector((state) => state.lessonPlanManagement);

  const loadModules = useCallback(
    async (params = {}) => {
      try {
        return await dispatch(fetchLessonPlanModules(params)).unwrap();
      } catch (err) {
        dispatch(showNotification({ message: err || 'Failed to load modules', type: 'error' }));
        throw err;
      }
    },
    [dispatch]
  );

  const loadCourseLessonPlans = useCallback(
    async (courseId, params = {}) => {
      try {
        return await dispatch(fetchCourseLessonPlans({ courseId, params })).unwrap();
      } catch (err) {
        dispatch(showNotification({ message: err || 'Failed to load lesson plans', type: 'error' }));
        throw err;
      }
    },
    [dispatch]
  );

  const createCourseLessonPlan = useCallback(
    async (courseId, payload) => {
      try {
        const result = await dispatch(addCourseLessonPlan({ courseId, payload })).unwrap();
        dispatch(showNotification({ message: 'Lesson plan added successfully!', type: 'success' }));
        return result;
      } catch (err) {
        dispatch(showNotification({ message: err || 'Failed to add lesson plan', type: 'error' }));
        throw err;
      }
    },
    [dispatch]
  );

  const editCourseLessonPlan = useCallback(
    async (courseId, lessonPlanId, payload) => {
      try {
        const result = await dispatch(updateCourseLessonPlan({ courseId, lessonPlanId, payload })).unwrap();
        dispatch(showNotification({ message: 'Lesson plan updated successfully!', type: 'success' }));
        return result;
      } catch (err) {
        dispatch(showNotification({ message: err || 'Failed to update lesson plan', type: 'error' }));
        throw err;
      }
    },
    [dispatch]
  );

  const requestDeleteCourseLessonPlan = useCallback(
    ({ courseId, lessonPlan, onDeleted }) => {
      if (!courseId || !lessonPlan?.id) return;
      dispatch(
        showConfirmationDialog({
          title: 'Delete Lesson Plan',
          message: `Are you sure you want to delete "${lessonPlan.title || 'this lesson plan'}"? This action cannot be undone.`,
          type: 'warning',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          onConfirm: async () => {
            try {
              await dispatch(deleteCourseLessonPlan({ courseId, lessonPlanId: lessonPlan.id })).unwrap();
              dispatch(showNotification({ message: 'Lesson plan deleted successfully.', type: 'success' }));
              if (typeof onDeleted === 'function') await onDeleted();
            } catch (err) {
              dispatch(showNotification({ message: err || 'Failed to delete lesson plan', type: 'error' }));
            }
          },
        })
      );
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearLessonPlanManagementError());
  }, [dispatch]);

  const clearCourseState = useCallback(() => {
    dispatch(clearCourseLessonPlansState());
  }, [dispatch]);

  return {
    modules,
    modulesPagination,
    course,
    courseLessonPlans,
    courseLessonPlansPagination,
    loadingModules,
    loadingCourseLessonPlans,
    addingLessonPlan,
    updatingLessonPlan,
    deletingLessonPlan,
    error,
    loadModules,
    loadCourseLessonPlans,
    createCourseLessonPlan,
    editCourseLessonPlan,
    requestDeleteCourseLessonPlan,
    clearError,
    clearCourseState,
  };
};

export default useLessonPlanMaterials;
