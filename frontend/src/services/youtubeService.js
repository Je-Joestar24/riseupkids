import api from '../api/axios';

/**
 * YouTube Live Service
 * 
 * Handles all YouTube Live-related API calls
 * Includes OAuth integration and live stream creation
 */

const youtubeService = {
  /**
   * Get YouTube OAuth authorization URL
   * @param {String} returnTo - Optional return path after OAuth
   * @returns {Promise} API response with authUrl and state
   */
  getAuthUrl: async (returnTo = '/admin/live-classes') => {
    try {
      const response = await api.get('/youtube/oauth/url', {
        params: { returnTo },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get YouTube connection status
   * @returns {Promise} API response with connection status
   */
  getConnectionStatus: async () => {
    try {
      const response = await api.get('/youtube/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Disconnect YouTube account
   * @returns {Promise} API response
   */
  disconnectYouTube: async () => {
    try {
      const response = await api.post('/youtube/disconnect');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Create a YouTube live stream
   * @param {Object} streamData - Stream details
   * @param {String} streamData.title - Stream title (required)
   * @param {String} streamData.description - Stream description (optional)
   * @param {String} streamData.privacyStatus - Always 'public' (fixed in UI)
   * @param {Boolean} streamData.enableAutoStart - Always true (fixed in UI)
   * @param {Boolean} streamData.enableAutoStop - Always true (fixed in UI)
   * @returns {Promise} API response with stream data (streamKey, rtmpUrl, watchUrl, id, etc.)
   */
  createLiveStream: async (streamData) => {
    try {
      const response = await api.post('/youtube/live/create', streamData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get paginated list of YouTube lives for current user
   * @param {Object} params - Query params
   * @param {Number} params.page - Page number (default 1)
   * @param {Number} params.limit - Items per page (default 10)
   * @param {String} params.search - Search term (title/description)
   * @param {Boolean|String} params.isArchived - Filter by archived
   * @returns {Promise} API response with data[] and pagination
   */
  getLiveList: async (params = {}) => {
    try {
      const response = await api.get('/youtube/live', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get one YouTube live by LMS id
   * @param {String} id - LMS document _id
   * @returns {Promise} API response with data (full live including streamKey, rtmpUrl, etc.)
   */
  getLiveById: async (id) => {
    try {
      const response = await api.get(`/youtube/live/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Archive a YouTube live (creator only)
   * @param {String} id - LMS document _id
   * @returns {Promise} API response with updated data
   */
  archiveLive: async (id) => {
    try {
      const response = await api.patch(`/youtube/live/${id}/archive`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Delete a YouTube live from LMS (creator only)
   * @param {String} id - LMS document _id
   * @returns {Promise} API response
   */
  deleteLive: async (id) => {
    try {
      const response = await api.delete(`/youtube/live/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default youtubeService;
