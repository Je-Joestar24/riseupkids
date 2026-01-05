import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllActivities,
  createActivity,
  fetchActivityById,
  updateActivity,
  archiveActivity,
  restoreActivity,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentActivity,
} from '../store/slices/activtySlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Custom hook for activity management
 * 
 * Provides easy access to activity state and management methods
 */
export const useActivity = () => {
  const dispatch = useDispatch();
  const {
    activities,
    currentActivity,
    pagination,
    filters,
    loading,
    error,
  } = useSelector((state) => state.activity);

  /**
   * Fetch all activities with filters
   * @param {Object} params - Query parameters (optional, uses current filters if not provided)
   * @returns {Promise} Fetch result
   */
  const fetchActivities = async (params = null) => {
    try {
      const queryParams = params || filters;
      const result = await dispatch(fetchAllActivities(queryParams)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch activities',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Create new activity
   * @param {FormData} formData - Activity data with files
   * @returns {Promise} Create result
   */
  const createNewActivity = async (formData) => {
    try {
      const result = await dispatch(createActivity(formData)).unwrap();
      
      dispatch(showNotification({
        message: 'Activity created successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to create activity',
        type: 'error',
      }));
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
   * Fetch single activity by ID
   * @param {String} activityId - Activity's ID
   * @returns {Promise} Fetch result
   */
  const fetchActivity = async (activityId) => {
    try {
      const result = await dispatch(fetchActivityById(activityId)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch activity',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Update activity
   * @param {String} activityId - Activity's ID
   * @param {FormData} formData - Activity data with optional cover image
   * @returns {Promise} Update result
   */
  const updateActivityData = async (activityId, formData) => {
    try {
      const result = await dispatch(updateActivity({ activityId, formData })).unwrap();
      
      dispatch(showNotification({
        message: 'Activity updated successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to update activity',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Archive activity
   * @param {String} activityId - Activity's ID
   * @returns {Promise} Archive result
   */
  const archiveActivityData = async (activityId) => {
    try {
      const result = await dispatch(archiveActivity(activityId)).unwrap();
      
      dispatch(showNotification({
        message: 'Activity archived successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to archive activity',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Restore archived activity
   * @param {String} activityId - Activity's ID
   * @returns {Promise} Restore result
   */
  const restoreActivityData = async (activityId) => {
    try {
      const result = await dispatch(restoreActivity(activityId)).unwrap();
      
      dispatch(showNotification({
        message: 'Activity restored successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to restore activity',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Clear error state
   */
  const clearActivityError = () => {
    dispatch(clearError());
  };

  /**
   * Clear current activity
   */
  const clearActivity = () => {
    dispatch(clearCurrentActivity());
  };

  return {
    // State
    activities,
    currentActivity,
    pagination,
    filters,
    loading,
    error,
    // Methods
    fetchActivities,
    fetchActivity,
    createNewActivity,
    updateActivityData,
    archiveActivityData,
    restoreActivityData,
    updateFilters,
    resetFilters,
    clearActivityError,
    clearActivity,
  };
};

export default useActivity;

