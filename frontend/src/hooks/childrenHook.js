import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllChildren,
  fetchChildById,
  createChild,
  updateChild,
  deleteChild,
  restoreChild,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentChild,
} from '../store/slices/childrenSlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Custom hook for children management
 * 
 * Provides easy access to children state and management methods
 */
export const useChildren = () => {
  const dispatch = useDispatch();
  const {
    children,
    currentChild,
    filters,
    loading,
    error,
  } = useSelector((state) => state.children);

  /**
   * Fetch all children with filters
   * @param {Object} params - Query parameters (optional, uses current filters if not provided)
   * @returns {Promise} Fetch result
   */
  const fetchChildren = async (params = null) => {
    try {
      const queryParams = params || filters;
      const result = await dispatch(fetchAllChildren(queryParams)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch children',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Fetch single child by ID
   * @param {String} childId - Child's ID
   * @returns {Promise} Fetch result
   */
  const fetchChild = async (childId) => {
    try {
      const result = await dispatch(fetchChildById(childId)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch child',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Create new child profile
   * @param {Object} childData - Child data
   * @param {String} childData.displayName - Child's display name (required)
   * @param {Number} [childData.age] - Child's age (0-18)
   * @param {String} [childData.avatar] - Avatar file path or URL
   * @param {String} [childData.currentJourney] - Current journey ID
   * @param {String} [childData.currentLesson] - Current lesson ID
   * @param {Object} [childData.preferences] - Child preferences
   * @returns {Promise} Create result
   */
  const createNewChild = async (childData) => {
    try {
      const result = await dispatch(createChild(childData)).unwrap();
      
      dispatch(showNotification({
        message: 'Child profile created successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to create child profile',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Update child profile
   * @param {String} childId - Child's ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} Update result
   */
  const updateChildData = async (childId, updateData) => {
    try {
      const result = await dispatch(updateChild({ childId, updateData })).unwrap();
      
      dispatch(showNotification({
        message: 'Child profile updated successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to update child profile',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Delete child profile (soft delete)
   * @param {String} childId - Child's ID
   * @returns {Promise} Delete result
   */
  const deleteChildData = async (childId) => {
    try {
      const result = await dispatch(deleteChild(childId)).unwrap();
      
      dispatch(showNotification({
        message: 'Child profile deleted successfully',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to delete child profile',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Restore archived child profile
   * @param {String} childId - Child's ID
   * @returns {Promise} Restore result
   */
  const restoreChildData = async (childId) => {
    try {
      const result = await dispatch(restoreChild(childId)).unwrap();
      
      dispatch(showNotification({
        message: 'Child profile restored successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to restore child profile',
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
   * Clear current child
   */
  const clearChild = () => {
    dispatch(clearCurrentChild());
  };

  /**
   * Clear error state
   */
  const clearChildrenError = () => {
    dispatch(clearError());
  };

  return {
    // State
    children,
    currentChild,
    filters,
    loading,
    error,
    // Methods
    fetchChildren,
    fetchChild,
    createNewChild,
    updateChildData,
    deleteChildData,
    restoreChildData,
    updateFilters,
    resetFilters,
    clearChild,
    clearChildrenError,
  };
};

export default useChildren;

