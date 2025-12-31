import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllParents,
  fetchParentById,
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentParent,
} from '../store/slices/parentsSlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Custom hook for parents management
 * 
 * Provides easy access to parents state and management methods
 */
export const useParents = () => {
  const dispatch = useDispatch();
  const {
    parents,
    currentParent,
    pagination,
    filters,
    loading,
    error,
  } = useSelector((state) => state.parents);

  /**
   * Fetch all parents with filters
   * @param {Object} params - Query parameters (optional, uses current filters if not provided)
   * @returns {Promise} Fetch result
   */
  const fetchParents = async (params = null) => {
    try {
      const queryParams = params || filters;
      const result = await dispatch(fetchAllParents(queryParams)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch parents',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Fetch single parent by ID
   * @param {String} parentId - Parent's ID
   * @returns {Promise} Fetch result
   */
  const fetchParent = async (parentId) => {
    try {
      const result = await dispatch(fetchParentById(parentId)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch parent',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Create new parent
   * @param {Object} parentData - Parent data
   * @param {String} parentData.name - Parent's name
   * @param {String} parentData.email - Parent's email
   * @param {String} parentData.password - Parent's password
   * @returns {Promise} Create result
   */
  const createNewParent = async (parentData) => {
    try {
      const result = await dispatch(createParent(parentData)).unwrap();
      
      dispatch(showNotification({
        message: 'Parent created successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to create parent',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Update parent
   * @param {String} parentId - Parent's ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} Update result
   */
  const updateParentData = async (parentId, updateData) => {
    try {
      const result = await dispatch(updateParent({ parentId, updateData })).unwrap();
      
      dispatch(showNotification({
        message: 'Parent updated successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to update parent',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Archive parent (soft delete)
   * @param {String} parentId - Parent's ID
   * @returns {Promise} Archive result
   */
  const archiveParentData = async (parentId) => {
    try {
      const result = await dispatch(archiveParent(parentId)).unwrap();
      
      dispatch(showNotification({
        message: 'Parent archived successfully',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to archive parent',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Restore archived parent
   * @param {String} parentId - Parent's ID
   * @returns {Promise} Restore result
   */
  const restoreParentData = async (parentId) => {
    try {
      const result = await dispatch(restoreParent(parentId)).unwrap();
      
      dispatch(showNotification({
        message: 'Parent restored successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to restore parent',
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
   * Clear current parent
   */
  const clearParent = () => {
    dispatch(clearCurrentParent());
  };

  /**
   * Clear error state
   */
  const clearParentsError = () => {
    dispatch(clearError());
  };

  return {
    // State
    parents,
    currentParent,
    pagination,
    filters,
    loading,
    error,
    // Methods
    fetchParents,
    fetchParent,
    createNewParent,
    updateParentData,
    archiveParentData,
    restoreParentData,
    updateFilters,
    resetFilters,
    clearParent,
    clearParentsError,
  };
};

export default useParents;

