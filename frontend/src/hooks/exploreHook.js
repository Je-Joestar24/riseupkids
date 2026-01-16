import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllExploreContent,
  createExploreContent,
  fetchExploreContentById,
  updateExploreContent,
  deleteExploreContent,
  fetchExploreContentByType,
  fetchFeaturedExploreContent,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentExploreContent,
} from '../store/slices/exploreSlice';
import { showNotification } from '../store/slices/uiSlice';
import { getVideoTypeLabel as getVideoTypeLabelFromConstants } from '../constants/exploreVideoTypes';

/**
 * Custom hook for explore content management
 * 
 * Provides easy access to explore content state and management methods
 * Handles CRUD operations for explore content
 */
export const useExplore = () => {
  const dispatch = useDispatch();
  const {
    exploreContent,
    currentExploreContent,
    featuredContent,
    contentByType,
    pagination,
    filters,
    loading,
    error,
  } = useSelector((state) => state.explore);

  /**
   * Fetch all explore content with filters
   * @param {Object} params - Query parameters (optional, uses current filters if not provided)
   * @returns {Promise} Fetch result
   */
  const fetchExploreContent = async (params = null) => {
    try {
      const sourceParams = params || filters;
      // Create a new object to avoid mutating Redux state
      const queryParams = {
        ...sourceParams,
        // Always set type to 'video'
        type: 'video',
        // videoType is optional - if not specified, shows all video types
      };
      const result = await dispatch(fetchAllExploreContent(queryParams)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error?.message || error || 'Failed to fetch explore content',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Create new explore content
   * @param {FormData} formData - Explore content data with files
   * @returns {Promise} Create result
   */
  const createNewExploreContent = async (formData) => {
    try {
      const result = await dispatch(createExploreContent(formData)).unwrap();
      
      dispatch(showNotification({
        message: 'Explore content created successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to create explore content',
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
   * Fetch single explore content by ID
   * @param {String} contentId - Explore content's ID
   * @returns {Promise} Fetch result
   */
  const fetchContent = async (contentId) => {
    try {
      const result = await dispatch(fetchExploreContentById(contentId)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch explore content',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Update explore content
   * @param {String} contentId - Explore content's ID
   * @param {FormData} formData - Explore content data with optional files
   * @returns {Promise} Update result
   */
  const updateExploreContentData = async (contentId, formData) => {
    try {
      const result = await dispatch(updateExploreContent({ contentId, formData })).unwrap();
      
      dispatch(showNotification({
        message: 'Explore content updated successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to update explore content',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Delete explore content (permanent hard delete)
   * @param {String} contentId - Explore content's ID
   * @returns {Promise} Delete result
   */
  const deleteExploreContentData = async (contentId) => {
    try {
      const result = await dispatch(deleteExploreContent(contentId)).unwrap();
      
      dispatch(showNotification({
        message: 'Explore content deleted successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to delete explore content',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Fetch explore content by type
   * @param {String} type - Content type (video, lesson, activity, etc.)
   * @param {Object} params - Query parameters
   * @returns {Promise} Fetch result
   */
  const fetchContentByType = async (type, params = {}) => {
    try {
      const result = await dispatch(fetchExploreContentByType({ type, params })).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch explore content by type',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Fetch featured explore content
   * @param {Number} limit - Maximum number of items (default: 10)
   * @returns {Promise} Fetch result
   */
  const fetchFeaturedContent = async (limit = 10) => {
    try {
      const result = await dispatch(fetchFeaturedExploreContent(limit)).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Failed to fetch featured explore content',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Clear error state
   */
  const clearExploreError = () => {
    dispatch(clearError());
  };

  /**
   * Clear current explore content
   */
  const clearContent = () => {
    dispatch(clearCurrentExploreContent());
  };

  /**
   * Prepare FormData for explore content creation/update
   * @param {Object} contentData - Explore content data object
   * @param {File} videoFile - Optional video file
   * @param {File} coverImageFile - Optional cover photo file
   * @returns {FormData} FormData object ready for API call
   */
  const prepareExploreFormData = (
    contentData,
    videoFile = null,
    coverImageFile = null
  ) => {
    const formData = new FormData();
    
    // Add basic fields
    if (contentData.title) formData.append('title', contentData.title);
    if (contentData.description) formData.append('description', contentData.description);
    // Always set type to 'video'
    formData.append('type', 'video');
    if (contentData.videoType) formData.append('videoType', contentData.videoType);
    if (contentData.starsAwarded !== undefined) {
      formData.append('starsAwarded', contentData.starsAwarded);
    }
    if (contentData.duration !== undefined && contentData.duration !== '') {
      formData.append('duration', contentData.duration);
    }
    if (contentData.isFeatured !== undefined) {
      formData.append('isFeatured', contentData.isFeatured);
    }
    if (contentData.isPublished !== undefined) {
      formData.append('isPublished', contentData.isPublished);
    }
    
    // Add files if provided
    if (videoFile) {
      formData.append('videoFile', videoFile);
    }
    if (coverImageFile) {
      formData.append('coverImage', coverImageFile);
    }
    
    return formData;
  };

  /**
   * Get full URL for explore content cover image
   * @param {String} coverImagePath - Relative cover image path (e.g., /uploads/explore/...)
   * @returns {String} Full URL for the cover image
   */
  const getCoverImageUrl = (coverImagePath) => {
    if (!coverImagePath) return null;
    
    // If already a full URL, return as-is
    if (coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')) {
      return coverImagePath;
    }
    
    // Build full URL from relative path
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${coverImagePath.startsWith('/') ? coverImagePath : `/${coverImagePath}`}`;
  };

  /**
   * Get full URL for explore content video file
   * @param {String} videoFileUrl - Relative video file URL
   * @returns {String} Full URL for the video file
   */
  const getVideoFileUrl = (videoFileUrl) => {
    if (!videoFileUrl) return null;
    
    // If already a full URL, return as-is
    if (videoFileUrl.startsWith('http://') || videoFileUrl.startsWith('https://')) {
      return videoFileUrl;
    }
    
    // Build full URL from relative path
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${videoFileUrl.startsWith('/') ? videoFileUrl : `/${videoFileUrl}`}`;
  };


  /**
   * Get content type label for display
   * @param {String} contentType - Content type (video, lesson, activity, etc.)
   * @returns {String} Human-readable label
   */
  const getContentTypeLabel = (contentType) => {
    const labels = {
      'video': 'Video',
      'lesson': 'Lesson',
      'activity': 'Activity',
      'activity_group': 'Activity Group',
      'book': 'Book',
      'audio': 'Audio',
    };
    return labels[contentType] || contentType;
  };

  /**
   * Get video type label for display
   * @param {String} videoType - Video type (replay, arts_crafts, cooking, music, movement_fitness, story_time, manners_etiquette)
   * @returns {String} Human-readable label
   */
  const getVideoTypeLabel = (videoType) => {
    return getVideoTypeLabelFromConstants(videoType);
  };

  return {
    // State
    exploreContent,
    currentExploreContent,
    featuredContent,
    contentByType,
    pagination,
    filters,
    loading,
    error,
    // Methods
    fetchExploreContent,
    fetchContent,
    createNewExploreContent,
    updateExploreContentData,
    deleteExploreContentData,
    fetchContentByType,
    fetchFeaturedContent,
    updateFilters,
    resetFilters,
    clearExploreError,
    clearContent,
    // Helpers
    prepareExploreFormData,
    getCoverImageUrl,
    getVideoFileUrl,
    getContentTypeLabel,
    getVideoTypeLabel,
  };
};

export default useExplore;
