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

  listManagedLabels: async ({ page = 1, limit = 25, search, availableOnly, signal } = {}) => {
    try {
      const response = await api.get(`${BASE_PATH}/labels`, {
        params: {
          page,
          limit,
          ...(search ? { search } : {}),
          ...(availableOnly === true ? { availableOnly: true } : {}),
          ...(availableOnly === false ? { availableOnly: false } : {}),
        },
        signal,
      });
      return response.data?.data || { page: 1, limit, total: 0, items: [] };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to list vision labels'));
    }
  },

  updateLabelAvailability: async (labelId, isAvailableForMissions) => {
    try {
      const response = await api.patch(`${BASE_PATH}/labels/${encodeURIComponent(labelId)}/availability`, {
        isAvailableForMissions,
      });
      return response.data?.data || null;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update label availability'));
    }
  },

  bulkUpdateLabelAvailability: async ({ labelIds, isAvailableForMissions, selectAllMatching, search } = {}) => {
    try {
      const response = await api.post(`${BASE_PATH}/labels/bulk-availability`, {
        labelIds,
        isAvailableForMissions,
        selectAllMatching,
        search,
      });
      return response.data?.data || { matched: 0, modified: 0 };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to bulk update label availability'));
    }
  },
};

export default starCamLabelCatalogService;
