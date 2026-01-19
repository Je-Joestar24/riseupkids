import api from '../api/axios';

/**
 * Explore Video Watch Service
 * 
 * Service for managing explore video watch tracking:
 * - Mark explore video as watched (completed) - awards stars on first watch
 * - Get explore video watch status for a child
 */
const exploreVideoWatchService = {
  /**
   * Mark explore video as watched (completed)
   * Awards stars on first watch (except for replay videos)
   * @param {String} exploreContentId - ExploreContent ID
   * @param {String} childId - Child's ID
   * @param {Number} [completionPercentage] - Optional completion percentage (0-100, default: 100)
   * @returns {Promise} API response with watch data
   */
  markExploreVideoWatched: async (exploreContentId, childId, completionPercentage = 100) => {
    try {
      const response = await api.post(`/explore/videos/${exploreContentId}/watch/child/${childId}`, {
        completionPercentage: Math.max(0, Math.min(100, completionPercentage)),
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record explore video watch';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get explore video watch status for a child
   * @param {String} exploreContentId - ExploreContent ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with watch status
   */
  getExploreVideoWatchStatus: async (exploreContentId, childId) => {
    try {
      const response = await api.get(`/explore/videos/${exploreContentId}/watch-status/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get explore video watch status';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get total stars earned for a specific video type
   * @param {String} videoType - Video type (e.g., 'replay', 'cooking', 'music', etc.)
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with total stars
   */
  getTotalStarsForVideoType: async (videoType, childId) => {
    try {
      const response = await api.get(`/explore/videos/video-type/${videoType}/total-stars/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get total stars for video type';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get progress for a specific video type (total videos and viewed videos count)
   * @param {String} videoType - Video type (e.g., 'replay', 'cooking', 'music', etc.)
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with progress data
   */
  getVideoTypeProgress: async (videoType, childId) => {
    try {
      const response = await api.get(`/explore/videos/video-type/${videoType}/progress/child/${childId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get video type progress';
      throw new Error(errorMessage);
    }
  },
};

export default exploreVideoWatchService;
