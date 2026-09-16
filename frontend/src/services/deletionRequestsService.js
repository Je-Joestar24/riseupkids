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

  /**
   * Chunk 10: this is a "deletion override" — the backend requires a step-up token (see
   * useStepUp()) attached as X-Step-Up-Token, obtained from a fresh 2FA code just before calling.
   */
  executeOne: async (requestId, stepUpToken) => {
    try {
      const response = await api.post(
        `/admin/deletion-requests/${requestId}/execute`,
        null,
        { headers: { 'X-Step-Up-Token': stepUpToken } }
      );
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to execute deletion request');
    }
  },

  executePending: async ({ force = false } = {}, stepUpToken) => {
    try {
      const response = await api.post('/admin/deletion-requests/execute-pending', null, {
        params: force ? { force: 'true' } : undefined,
        headers: { 'X-Step-Up-Token': stepUpToken },
      });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to process pending deletion requests');
    }
  },
};

export default deletionRequestsService;
