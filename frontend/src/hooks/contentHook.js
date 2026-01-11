import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllContent,
  createContent,
  fetchContentById,
  updateContent,
  deleteContent,
  restoreContent,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentContent,
  setContentType,
} from '../store/slices/contentSlice';
import { showNotification } from '../store/slices/uiSlice';
import { CONTENT_TYPES } from '../services/contentService';

/**
 * Custom hook for unified content management
 * 
 * Provides easy access to content state and management methods
 * Supports all content types: activities, books, videos, audio assignments
 */
export const useContent = () => {
  const dispatch = useDispatch();
  const {
    contentItems,
    currentContent,
    currentContentType,
    pagination,
    filters,
    loading,
    error,
  } = useSelector((state) => state.content);

  /**
   * Fetch all content items with filters
   * @param {String} contentType - Content type (optional, uses current filter if not provided)
   * @param {Object} params - Query parameters (optional, uses current filters if not provided)
   * @returns {Promise} Fetch result
   */
  const fetchContents = async (contentType = null, params = null) => {
    try {
      const type = contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
      const queryParams = params || filters;
      
      // Build query params based on content type
      const finalParams = { ...queryParams };
      
      // Remove contentType from query params (it's not an API param)
      delete finalParams.contentType;
      
      // Handle type-specific filters
      if (type === CONTENT_TYPES.BOOK) {
        if (filters.typeSpecific?.language) {
          finalParams.language = filters.typeSpecific.language;
        }
        if (filters.typeSpecific?.readingLevel) {
          finalParams.readingLevel = filters.typeSpecific.readingLevel;
        }
      } else if (type === CONTENT_TYPES.VIDEO) {
        if (filters.typeSpecific?.isActive !== undefined) {
          finalParams.isActive = filters.typeSpecific.isActive;
        }
      } else if (type === CONTENT_TYPES.AUDIO_ASSIGNMENT) {
        if (filters.typeSpecific?.isStarAssignment !== undefined) {
          finalParams.isStarAssignment = filters.typeSpecific.isStarAssignment;
        }
      }
      
      const result = await dispatch(fetchAllContent({ contentType: type, params: finalParams })).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch content',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Create new content item
   * @param {String} contentType - Content type
   * @param {FormData} formData - Content data with files
   * @returns {Promise} Create result
   */
  const createNewContent = async (contentType, formData) => {
    try {
      const result = await dispatch(createContent({ contentType, formData })).unwrap();
      
      dispatch(showNotification({
        message: `${getContentTypeLabel(contentType)} created successfully!`,
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || `Failed to create ${getContentTypeLabel(contentType)}`,
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
   * Set content type filter
   * @param {String} contentType - Content type to filter by
   */
  const setContentTypeFilter = (contentType) => {
    dispatch(setContentType(contentType));
  };

  /**
   * Fetch single content item by ID
   * @param {String} contentType - Content type
   * @param {String} contentId - Content item's ID
   * @returns {Promise} Fetch result
   */
  const fetchContent = async (contentType, contentId) => {
    try {
      const result = await dispatch(fetchContentById({ contentType, contentId })).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch content',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Update content item
   * @param {String} contentType - Content type
   * @param {String} contentId - Content item's ID
   * @param {FormData} formData - Content data with optional files
   * @returns {Promise} Update result
   */
  const updateContentData = async (contentType, contentId, formData) => {
    try {
      const result = await dispatch(updateContent({ contentType, contentId, formData })).unwrap();
      
      dispatch(showNotification({
        message: `${getContentTypeLabel(contentType)} updated successfully!`,
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || `Failed to update ${getContentTypeLabel(contentType)}`,
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Delete content item
   * @param {String} contentType - Content type
   * @param {String} contentId - Content item's ID
   * @returns {Promise} Delete result
   */
  const deleteContentData = async (contentType, contentId) => {
    try {
      const result = await dispatch(deleteContent({ contentType, contentId })).unwrap();
      
      dispatch(showNotification({
        message: `${getContentTypeLabel(contentType)} deleted successfully!`,
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || `Failed to delete ${getContentTypeLabel(contentType)}`,
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Restore archived content item (activities only)
   * @param {String} contentType - Content type (should be 'activity')
   * @param {String} contentId - Content item's ID
   * @returns {Promise} Restore result
   */
  const restoreContentData = async (contentType, contentId) => {
    try {
      const result = await dispatch(restoreContent({ contentType, contentId })).unwrap();
      
      dispatch(showNotification({
        message: `${getContentTypeLabel(contentType)} restored successfully!`,
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || `Failed to restore ${getContentTypeLabel(contentType)}`,
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Archive content item (activities only - uses delete for now)
   * @param {String} contentType - Content type (should be 'activity')
   * @param {String} contentId - Content item's ID
   * @returns {Promise} Archive result
   */
  const archiveContentData = async (contentType, contentId) => {
    // For activities, archive is the same as delete (soft delete)
    return deleteContentData(contentType, contentId);
  };

  /**
   * Clear error state
   */
  const clearContentError = () => {
    dispatch(clearError());
  };

  /**
   * Clear current content
   */
  const clearContent = () => {
    dispatch(clearCurrentContent());
  };

  /**
   * Get content type label for display
   * @param {String} contentType - Content type
   * @returns {String} Human-readable label
   */
  const getContentTypeLabel = (contentType) => {
    const labels = {
      [CONTENT_TYPES.ACTIVITY]: 'Activity',
      [CONTENT_TYPES.BOOK]: 'Book',
      [CONTENT_TYPES.VIDEO]: 'Video',
      [CONTENT_TYPES.AUDIO_ASSIGNMENT]: 'Audio Assignment',
      [CONTENT_TYPES.CHANT]: 'Chant',
    };
    return labels[contentType] || 'Content';
  };

  /**
   * Get filtered content items (by current contentType filter)
   */
  const getFilteredContentItems = () => {
    if (!filters.contentType) {
      return contentItems;
    }
    return contentItems.filter(item => item._contentType === filters.contentType);
  };

  return {
    // State
    contentItems: getFilteredContentItems(),
    allContentItems: contentItems, // All items regardless of filter
    currentContent,
    currentContentType,
    pagination,
    filters,
    loading,
    error,
    // Methods
    fetchContents,
    fetchContent,
    createNewContent,
    updateContentData,
    deleteContentData,
    archiveContentData,
    restoreContentData,
    updateFilters,
    resetFilters,
    setContentTypeFilter,
    clearContentError,
    clearContent,
    getContentTypeLabel,
    // Constants
    CONTENT_TYPES,
  };
};

export default useContent;

