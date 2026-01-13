import api from '../api/axios';

/**
 * Video Watch Service
 * 
 * Service for managing video watch tracking:
 * - Mark video as watched (completed)
 * - Get video watch status for a child
 * - Get all video watches for a child
 * - Reset video watch count (admin/parent)
 */
const videoWatchService = {
  /**
   * Mark video as watched (completed)
   * @param {String} videoId - Video's ID (Media ID)
   * @param {String} childId - Child's ID
   * @param {Number} [completionPercentage] - Optional completion percentage (0-100, default: 100)
   * @returns {Promise} API response with watch data
   */
  markVideoWatched: async (videoId, childId, completionPercentage = 100) => {
    try {
      const response = await api.post(`/video-watch/${videoId}/child/${childId}`, {
        completionPercentage: Math.max(0, Math.min(100, completionPercentage)),
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record video watch';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get video watch status for a child
   * @param {String} videoId - Video's ID (Media ID)
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with watch status
   */
  getVideoWatchStatus: async (videoId, childId) => {
    try {
      const response = await api.get(`/video-watch/${videoId}/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get video watch status';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all video watch statuses for a child
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with all video watches
   */
  getChildVideoWatches: async (childId) => {
    try {
      const response = await api.get(`/video-watch/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get child video watches';
      throw new Error(errorMessage);
    }
  },

  /**
   * Reset video watch count for a child (admin/parent action)
   * @param {String} videoId - Video's ID (Media ID)
   * @param {String} childId - Child's ID
   * @returns {Promise} API response
   */
  resetVideoWatch: async (videoId, childId) => {
    try {
      const response = await api.delete(`/video-watch/${videoId}/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset video watch';
      throw new Error(errorMessage);
    }
  },
};

export default videoWatchService;
