import api from '../api/axios';

const BASE_PATH = '/admin/star-cam/label-catalog';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const starCamLabelCatalogService = {
  searchLabels: async ({ query, limit = 20, childFriendlyOnly = false, signal } = {}) => {
    try {
      const response = await api.get(`${BASE_PATH}/search`, {
        params: {
          q: query,
          limit,
          ...(childFriendlyOnly ? { childFriendlyOnly: true } : {}),
        },
        signal,
      });
      return response.data?.data || { query: query || '', results: [] };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to search vision labels'));
    }
  },

  listRecentCustomLabels: async ({ limit = 20, signal } = {}) => {
    try {
      const response = await api.get(`${BASE_PATH}/recent-custom`, {
        params: { limit },
        signal,
      });
      return response.data?.data || { results: [] };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load recent custom labels'));
    }
  },

  createCustomLabel: async ({ displayName, defaultTerms } = {}) => {
    try {
      const response = await api.post(`${BASE_PATH}/custom`, {
        displayName,
        defaultTerms,
      });
      return response.data?.data || null;
    } catch (error) {
      const err = new Error(getErrorMessage(error, 'Failed to create custom label'));
      err.statusCode = error?.response?.status;
      err.existingLabelId = error?.response?.data?.existingLabelId;
      throw err;
    }
  },
};

export default starCamLabelCatalogService;
