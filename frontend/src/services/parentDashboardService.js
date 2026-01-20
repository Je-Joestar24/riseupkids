import api from '../api/axios';

/**
 * Parent Dashboard Service
 * 
 * Service for fetching parent dashboard data
 */
const parentDashboardService = {
  /**
   * Get child progress summary
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with child progress data
   */
  getChildProgress: async (childId) => {
    try {
      const response = await api.get(`/parent-dashboard/child/${childId}/progress`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default parentDashboardService;
