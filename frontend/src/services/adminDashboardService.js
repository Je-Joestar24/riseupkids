import api from '../api/axios';

/**
 * Admin Dashboard Service
 *
 * Handles all admin dashboard-related API calls
 */
const adminDashboardService = {
  /**
   * Get dashboard statistics
   * @returns {Promise} API response with dashboard stats
   */
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default adminDashboardService;
