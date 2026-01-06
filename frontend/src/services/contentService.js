import api from '../api/axios';

/**
 * Content Service
 * 
 * Unified service for managing all content types:
 * - Activities (SCORM-based)
 * - Books (SCORM-based with reading logic)
 * - Videos (playable video + SCORM)
 * - Audio Assignments (reference audio)
 * 
 * All methods accept a contentType parameter to route to the correct API endpoint
 */

// Content type constants
export const CONTENT_TYPES = {
  ACTIVITY: 'activity',
  BOOK: 'book',
  VIDEO: 'video',
  AUDIO_ASSIGNMENT: 'audioAssignment',
};

// API endpoint mapping
const API_ENDPOINTS = {
  [CONTENT_TYPES.ACTIVITY]: '/activities',
  [CONTENT_TYPES.BOOK]: '/books',
  [CONTENT_TYPES.VIDEO]: '/videos',
  [CONTENT_TYPES.AUDIO_ASSIGNMENT]: '/audio-assignments',
};

const contentService = {
  /**
   * Get all content items with filtering and pagination
   * @param {String} contentType - Content type (activity, book, video, audioAssignment)
   * @param {Object} params - Query parameters
   * @param {Boolean} params.isPublished - Filter by published status
   * @param {String} params.search - Search in title/description
   * @param {Number} params.page - Page number
   * @param {Number} params.limit - Items per page
   * @param {Object} params.typeSpecific - Type-specific filters (e.g., language, readingLevel for books)
   * @returns {Promise} API response with content data
   */
  getAllContent: async (contentType, params = {}) => {
    try {
      const endpoint = API_ENDPOINTS[contentType];
      if (!endpoint) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Merge type-specific filters with general params
      const queryParams = { ...params };
      if (params.typeSpecific) {
        Object.assign(queryParams, params.typeSpecific);
        delete queryParams.typeSpecific;
      }

      const response = await api.get(endpoint, { params: queryParams });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Create new content item with file uploads
   * @param {String} contentType - Content type
   * @param {FormData} formData - Content data with files
   * @returns {Promise} API response with created content data
   */
  createContent: async (contentType, formData) => {
    try {
      const endpoint = API_ENDPOINTS[contentType];
      if (!endpoint) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const response = await api.post(endpoint, formData, {
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
   * Get single content item by ID
   * @param {String} contentType - Content type
   * @param {String} contentId - Content item's ID
   * @returns {Promise} API response with content data
   */
  getContentById: async (contentType, contentId) => {
    try {
      const endpoint = API_ENDPOINTS[contentType];
      if (!endpoint) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const response = await api.get(`${endpoint}/${contentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Update content item
   * @param {String} contentType - Content type
   * @param {String} contentId - Content item's ID
   * @param {FormData} formData - Content data with optional files
   * @returns {Promise} API response with updated content data
   */
  updateContent: async (contentType, contentId, formData) => {
    try {
      const endpoint = API_ENDPOINTS[contentType];
      if (!endpoint) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const response = await api.put(`${endpoint}/${contentId}`, formData, {
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
   * Delete/Archive content item
   * @param {String} contentType - Content type
   * @param {String} contentId - Content item's ID
   * @returns {Promise} API response
   */
  deleteContent: async (contentType, contentId) => {
    try {
      const endpoint = API_ENDPOINTS[contentType];
      if (!endpoint) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const response = await api.delete(`${endpoint}/${contentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Restore archived content item (for activities only)
   * @param {String} contentType - Content type (should be 'activity')
   * @param {String} contentId - Content item's ID
   * @returns {Promise} API response
   */
  restoreContent: async (contentType, contentId) => {
    try {
      // Only activities support restore
      if (contentType !== CONTENT_TYPES.ACTIVITY) {
        throw new Error('Restore is only supported for activities');
      }

      const endpoint = API_ENDPOINTS[contentType];
      const response = await api.patch(`${endpoint}/${contentId}/restore`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default contentService;

