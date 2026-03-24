import api from '../api/axios';

/**
 * Program Materials Service
 *
 * Fetches printable materials by step for a selected child.
 */
const programMaterilialsService = {
  /**
   * Get printable materials for one child profile.
   * @param {string} childId
   * @returns {Promise<object>}
   */
  getByChildId: async (childId) => {
    if (!childId) {
      throw new Error('childId is required');
    }

    try {
      const response = await api.get(`/parent/program-materials/children/${childId}`);
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to fetch program materials';
    }
  },
};

export default programMaterilialsService;
