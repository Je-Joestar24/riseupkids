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
   * @param {Date|String} streamData.scheduledStartTime - Scheduled start time (optional, ISO string)
   * @param {String} streamData.privacyStatus - Privacy status: 'public', 'unlisted', 'private' (default: 'unlisted')
   * @param {Boolean} streamData.enableAutoStart - Auto-start when OBS connects (optional, default: false)
   * @param {Boolean} streamData.enableAutoStop - Auto-stop when OBS disconnects (optional, default: false)
   * @returns {Promise} API response with stream data (streamKey, rtmpUrl, watchUrl, etc.)
   */
  createLiveStream: async (streamData) => {
    try {
      const response = await api.post('/youtube/live/create', streamData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default youtubeService;
