import api from '../api/axios';

/**
 * Child Profile Service
 * 
 * Handles all child profile-related API calls
 * For child profile page with stats, badges, and level info
 */

const childProfileService = {
  /**
   * Get child profile with full stats, badges, and level info
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with child profile data
   */
  getChildProfile: async (childId) => {
    try {
      const response = await api.get(`/children/${childId}/profile`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get all badges (for display)
   * @returns {Promise} API response with all badges
   */
  getAllBadges: async () => {
    try {
      const response = await api.get('/badges');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get child's latest badges earned (limit 5)
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with latest badges
   */
  getChildLatestBadges: async (childId) => {
    try {
      const response = await api.get(`/badges/child/${childId}/latest`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default childProfileService;
