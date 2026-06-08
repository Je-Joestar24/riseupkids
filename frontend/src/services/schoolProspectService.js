import api from '../api/axios';

/**
 * School Prospect Service (admin)
 *
 * Handles school application prospects from the sales schools page.
 */
const schoolProspectService = {
  /**
   * List school prospects with pagination and search.
   * @param {Object} params - { page, limit, q, email, language, role, flodeskStatus, cityCountry }
   * @returns {Promise<Object>} API response
   */
  getSchoolProspects: async (params = {}) => {
    try {
      const response = await api.get('/admin/school-prospects', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default schoolProspectService;
