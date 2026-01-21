import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllTeachers,
  fetchTeacherById,
  createTeacher,
  updateTeacher,
  archiveTeacher,
  restoreTeacher,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentTeacher,
} from '../store/slices/teacherSlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Custom hook for teachers management
 *
 * Provides easy access to teachers state and management methods
 */
export const useTeachers = () => {
  const dispatch = useDispatch();
  const { teachers, currentTeacher, pagination, filters, loading, error } = useSelector(
    (state) => state.teachers
  );

  /**
   * Fetch all teachers with filters
   * @param {Object} params - Query parameters (optional, uses current filters if not provided)
   * @returns {Promise} Fetch result
   */
  const fetchTeachers = async (params = null) => {
    try {
      const queryParams = params || filters;
      const result = await dispatch(fetchAllTeachers(queryParams)).unwrap();
      return result;
    } catch (error) {
      dispatch(
        showNotification({
          message: error || 'Failed to fetch teachers',
          type: 'error',
        })
      );
      throw error;
    }
  };

  /**
   * Fetch single teacher by ID
   * @param {String} teacherId - Teacher's ID
   * @returns {Promise} Fetch result
   */
  const fetchTeacher = async (teacherId) => {
    try {
      const result = await dispatch(fetchTeacherById(teacherId)).unwrap();
      return result;
    } catch (error) {
      dispatch(
        showNotification({
          message: error || 'Failed to fetch teacher',
          type: 'error',
        })
      );
      throw error;
    }
  };

  /**
   * Create new teacher
   * @param {Object} teacherData - Teacher data
   * @returns {Promise} Create result
   */
  const createNewTeacher = async (teacherData) => {
    try {
      const result = await dispatch(createTeacher(teacherData)).unwrap();
      dispatch(
        showNotification({
          message: 'Teacher created successfully!',
          type: 'success',
        })
      );
      return result;
    } catch (error) {
      dispatch(
        showNotification({
          message: error || 'Failed to create teacher',
          type: 'error',
        })
      );
      throw error;
    }
  };

  /**
   * Update teacher
   * @param {String} teacherId - Teacher's ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} Update result
   */
  const updateTeacherData = async (teacherId, updateData) => {
    try {
      const result = await dispatch(updateTeacher({ teacherId, updateData })).unwrap();
      dispatch(
        showNotification({
          message: 'Teacher updated successfully!',
          type: 'success',
        })
      );
      return result;
    } catch (error) {
      dispatch(
        showNotification({
          message: error || 'Failed to update teacher',
          type: 'error',
        })
      );
      throw error;
    }
  };

  /**
   * Archive teacher (soft delete)
   * @param {String} teacherId - Teacher's ID
   * @returns {Promise} Archive result
   */
  const archiveTeacherData = async (teacherId) => {
    try {
      const result = await dispatch(archiveTeacher(teacherId)).unwrap();
      dispatch(
        showNotification({
          message: 'Teacher archived successfully',
          type: 'success',
        })
      );
      return result;
    } catch (error) {
      dispatch(
        showNotification({
          message: error || 'Failed to archive teacher',
          type: 'error',
        })
      );
      throw error;
    }
  };

  /**
   * Restore archived teacher
   * @param {String} teacherId - Teacher's ID
   * @returns {Promise} Restore result
   */
  const restoreTeacherData = async (teacherId) => {
    try {
      const result = await dispatch(restoreTeacher(teacherId)).unwrap();
      dispatch(
        showNotification({
          message: 'Teacher restored successfully!',
          type: 'success',
        })
      );
      return result;
    } catch (error) {
      dispatch(
        showNotification({
          message: error || 'Failed to restore teacher',
          type: 'error',
        })
      );
      throw error;
    }
  };

  /**
   * Update filters
   * @param {Object} newFilters - Filter values to update
   */
  const updateFilters = (newFilters) => {
    dispatch(setFilters(newFilters));
  };

  /**
   * Clear all filters
   */
  const resetFilters = () => {
    dispatch(clearFilters());
  };

  /**
   * Clear current teacher
   */
  const clearTeacher = () => {
    dispatch(clearCurrentTeacher());
  };

  /**
   * Clear error state
   */
  const clearTeachersError = () => {
    dispatch(clearError());
  };

  return {
    // State
    teachers,
    currentTeacher,
    pagination,
    filters,
    loading,
    error,
    // Methods
    fetchTeachers,
    fetchTeacher,
    createNewTeacher,
    updateTeacherData,
    archiveTeacherData,
    restoreTeacherData,
    updateFilters,
    resetFilters,
    clearTeacher,
    clearTeachersError,
  };
};

export default useTeachers;

