import api from '../api/axios';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const deletionRequestsService = {
  list: async ({ status, limit } = {}) => {
    try {
      const response = await api.get('/admin/deletion-requests', {
        params: { status, limit },
      });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to fetch deletion requests');
    }
  },

  executeOne: async (requestId) => {
    try {
      const response = await api.post(`/admin/deletion-requests/${requestId}/execute`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to execute deletion request');
    }
  },

  executePending: async ({ force = false } = {}) => {
    try {
      const response = await api.post('/admin/deletion-requests/execute-pending', null, {
        params: force ? { force: 'true' } : undefined,
      });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to process pending deletion requests');
    }
  },
};

export default deletionRequestsService;
