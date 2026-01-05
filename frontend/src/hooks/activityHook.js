import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllActivities,
  createActivity,
  clearError,
  setFilters,
  clearFilters,
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
   * Clear error state
   */
  const clearActivityError = () => {
    dispatch(clearError());
  };

  return {
    // State
    activities,
    pagination,
    filters,
    loading,
    error,
    // Methods
    fetchActivities,
    createNewActivity,
    updateFilters,
    resetFilters,
    clearActivityError,
  };
};

export default useActivity;

