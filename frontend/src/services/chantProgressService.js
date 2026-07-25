import api from '../api/axios';

const chantProgressService = {
  start: async (chantId, childId) => {
    const response = await api.post(`/chants/${chantId}/child/${childId}/start`);
    return response.data;
  },

  getProgress: async (chantId, childId) => {
    const response = await api.get(`/chants/${chantId}/child/${childId}/progress`);
    return response.data;
  },

  /**
   * Watch-only completion via JSON (avoids broken multipart Content-Type / boundary).
   */
  completeWatch: async (chantId, childId, payload = {}) => {
    const response = await api.post(`/chants/${chantId}/child/${childId}/complete`, {
      timeSpent: payload.timeSpent ?? 0,
      metadata: payload.metadata ?? { completionType: 'watch' },
    });
    return response.data;
  },

  /**
   * Multipart completion with optional recorded audio.
   * Leave Content-Type unset so the browser/axios sets the boundary.
   */
  complete: async (chantId, childId, formData) => {
    const response = await api.post(
      `/chants/${chantId}/child/${childId}/complete`,
      formData
    );
    return response.data;
  },
};

export default chantProgressService;
