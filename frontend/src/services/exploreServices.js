import api from '../api/axios';

/**
 * Explore Service
 * 
 * Service for managing Explore Content resources:
 * - Create explore content with video files and cover photos
 * - List explore content with filtering and pagination
 * - Get explore content by ID
 * - Get explore content by type (video, lesson, etc.)
 * - Get featured explore content
 * - Update explore content
 * - Delete explore content
 * 
 * Video Types: replay, arts_crafts, cooking, music, movement_fitness, story_time, manners_etiquette
 * 
 * All methods handle multipart/form-data for file uploads
 */

const exploreService = {
  /**
   * Get all explore content with filtering and pagination
   * @param {Object} params - Query parameters
   * @param {String} params.type - Filter by content type (video, lesson, activity, etc.)
   * @param {String} params.videoType - Filter by video subtype (replay, arts_crafts, cooking, music, movement_fitness, story_time, manners_etiquette)
   * @param {Boolean} params.isPublished - Filter by published status
   * @param {Boolean} params.isFeatured - Filter by featured status
   * @param {String} params.search - Search in title/description/category
   * @param {Number} params.page - Page number (default: 1)
   * @param {Number} params.limit - Items per page (default: 10)
   * @returns {Promise} API response with explore content data and pagination
   */
  getAllExploreContent: async (params = {}) => {
    try {
      const response = await api.get('/explore', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Create new explore content with optional files
   * @param {FormData} formData - Explore content data with files
   * @returns {Promise} API response with created explore content data
   */
  createExploreContent: async (formData) => {
    try {
      const response = await api.post('/explore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get single explore content by ID
   * @param {String} contentId - Explore content's ID
   * @returns {Promise} API response with explore content data
   */
  getExploreContentById: async (contentId) => {
    try {
      const response = await api.get(`/explore/${contentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Update explore content
   * @param {String} contentId - Explore content's ID
   * @param {FormData} formData - Explore content data with optional files
   * @returns {Promise} API response with updated explore content data
   */
  updateExploreContent: async (contentId, formData) => {
    try {
      const response = await api.put(`/explore/${contentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Delete explore content (permanent hard delete)
   * @param {String} contentId - Explore content's ID
   * @returns {Promise} API response
   */
  deleteExploreContent: async (contentId) => {
    try {
      const response = await api.delete(`/explore/${contentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get explore content by type
   * @param {String} type - Content type (video, lesson, activity, etc.)
   * @param {Object} params - Query parameters
   * @param {String} params.videoType - Filter by video subtype (replay, arts_crafts, cooking, music, movement_fitness, story_time, manners_etiquette) - only for video type
   * @param {Boolean} params.isFeatured - Filter by featured status
   * @param {Number} params.page - Page number (default: 1)
   * @param {Number} params.limit - Items per page (default: 10)
   * @returns {Promise} API response with explore content data and pagination
   */
  getExploreContentByType: async (type, params = {}) => {
    try {
      const response = await api.get(`/explore/type/${type}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get featured explore content
   * @param {Number} limit - Maximum number of items (default: 10)
   * @returns {Promise} API response with featured explore content data
   */
  getFeaturedExploreContent: async (limit = 10) => {
    try {
      const response = await api.get('/explore/featured', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default exploreService;
