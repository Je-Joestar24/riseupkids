import api from '../api/axios';

// API Service functions
export const apiService = {
  // Test API connection
  testConnection: async () => {
    try {
      const response = await api.post('/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default apiService;

