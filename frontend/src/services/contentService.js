import api from '../api/axios';
import { TIMEOUT } from '../constants/timeout';
/**
 * Content Service
 *
 * Unified service for managing all content types:
 * - Activities (SCORM-based)
 * - Books (SCORM or HTML5: same endpoint POST /api/books; formData.packageType selects handling)
 * - Videos (playable video + SCORM)
 * - Audio Assignments (reference audio)
 * - Chants (optional audio and SCORM files)
 *
 * All methods accept a contentType parameter to route to the correct API endpoint.
 * Book create: always POST /api/books with packageType and scormFile (ZIP); no separate HTML5 URL.
 */

// Content type constants
export const CONTENT_TYPES = {
  ACTIVITY: 'activity',
  BOOK: 'book',
  VIDEO: 'video',
  AUDIO_ASSIGNMENT: 'audioAssignment',
  CHANT: 'chant',
  STAR_CAM_MISSION: 'starCamMission',
};

// API endpoint mapping (BOOK: same /books for SCORM and HTML5; backend uses body.packageType)
const API_ENDPOINTS = {
  [CONTENT_TYPES.ACTIVITY]: '/activities',
  [CONTENT_TYPES.BOOK]: '/books',
  [CONTENT_TYPES.VIDEO]: '/videos',
  [CONTENT_TYPES.AUDIO_ASSIGNMENT]: '/audio-assignments',
  [CONTENT_TYPES.CHANT]: '/chants',
  [CONTENT_TYPES.STAR_CAM_MISSION]: '/admin/star-cam/missions',
};

const contentService = {
  /**
   * Get all content items with filtering and pagination
   * @param {String} contentType - Content type (activity, book, video, audioAssignment, chant)
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

      // FormData: do not set Content-Type so the browser sets multipart/form-data with boundary (required for file uploads)
      const config =
        formData instanceof FormData
          ? {
              headers: { 'Content-Type': undefined },
              timeout: TIMEOUT, // 2 min for large ZIP (SCORM/HTML5)
            }
          : {};
      const response = await api.post(endpoint, formData, config);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.code === 'ERR_NETWORK' || error.message === 'Network Error'
          ? 'Cannot reach the backend server. Make sure it is running (e.g. on the port in your API URL).'
          : error.message);
      throw msg;
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

      // FormData: do not set Content-Type so the browser sets multipart/form-data with boundary
      const config =
        formData instanceof FormData
          ? {
              headers: { 'Content-Type': undefined },
              timeout: 120000,
            }
          : {};
      const response = await api.put(`${endpoint}/${contentId}`, formData, config);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.code === 'ERR_NETWORK' || error.message === 'Network Error'
          ? 'Cannot reach the backend server. Make sure it is running (e.g. on the port in your API URL).'
          : error.message);
      throw msg;
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
   * Archive content item (soft delete for supported types)
   * @param {String} contentType - Content type
   * @param {String} contentId - Content item's ID
   * @returns {Promise} API response
   */
  archiveContent: async (contentType, contentId) => {
    try {
      const endpoint = API_ENDPOINTS[contentType];
      if (!endpoint) {
        throw new Error(`Invalid content type: ${contentType}`);
      }
      if (contentType !== CONTENT_TYPES.ACTIVITY && contentType !== CONTENT_TYPES.BOOK) {
        throw new Error('Archive is only supported for activities and books');
      }

      const response = await api.patch(`${endpoint}/${contentId}/archive`);
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
      // Activities and books support restore
      if (contentType !== CONTENT_TYPES.ACTIVITY && contentType !== CONTENT_TYPES.BOOK) {
        throw new Error('Restore is only supported for activities and books');
      }

      const endpoint = API_ENDPOINTS[contentType];
      const restorePath = contentType === CONTENT_TYPES.BOOK ? 'unarchive' : 'restore';
      const response = await api.patch(`${endpoint}/${contentId}/${restorePath}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Update Star Cam mission vocabulary entry (with optional media replacements)
   * @param {String} missionId
   * @param {Number|String} sortOrder
   * @param {Object} payload
   * @returns {Promise}
   */
  updateStarCamVocabulary: async (missionId, sortOrder, payload = {}) => {
    try {
      const endpoint = API_ENDPOINTS[CONTENT_TYPES.STAR_CAM_MISSION];
      const formData = new FormData();

      if (payload.displayText !== undefined) formData.append('displayText', payload.displayText || '');
      if (payload.target !== undefined) formData.append('target', payload.target || '');
      if (payload.imageFile) formData.append('image', payload.imageFile);
      if (payload.audioFile) formData.append('audio', payload.audioFile);
      if (payload.introAudioFile) formData.append('introAudio', payload.introAudioFile);
      if (payload.tryAgainAudioFile) formData.append('tryAgainAudio', payload.tryAgainAudioFile);
      if (payload.successAudioFile) formData.append('successAudio', payload.successAudioFile);
      if (payload.pronunciationVideoFile) formData.append('pronunciationVideo', payload.pronunciationVideoFile);

      const response = await api.patch(`${endpoint}/${missionId}/vocab/${sortOrder}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Delete Star Cam mission vocabulary entry by sortOrder
   * @param {String} missionId
   * @param {Number|String} sortOrder
   * @returns {Promise}
   */
  deleteStarCamVocabulary: async (missionId, sortOrder) => {
    try {
      const endpoint = API_ENDPOINTS[CONTENT_TYPES.STAR_CAM_MISSION];
      const response = await api.delete(`${endpoint}/${missionId}/vocab/${sortOrder}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default contentService;

