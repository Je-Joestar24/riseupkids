import api from '../api/axios';

/**
 * Content Creators Service — admin-only account management
 */
const contentCreatorService = {
  getAllContentCreators: async (params = {}) => {
    try {
      const response = await api.get('/content-creators', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getContentCreatorById: async (contentCreatorId) => {
    try {
      const response = await api.get(`/content-creators/${contentCreatorId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createContentCreator: async (contentCreatorData) => {
    try {
      const response = await api.post('/content-creators', contentCreatorData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateContentCreator: async (contentCreatorId, updateData) => {
    try {
      const response = await api.put(`/content-creators/${contentCreatorId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  archiveContentCreator: async (contentCreatorId) => {
    try {
      const response = await api.delete(`/content-creators/${contentCreatorId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  restoreContentCreator: async (contentCreatorId) => {
    try {
      const response = await api.put(`/content-creators/${contentCreatorId}/restore`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default contentCreatorService;
