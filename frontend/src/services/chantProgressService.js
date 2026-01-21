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

  complete: async (chantId, childId, formData) => {
    const response = await api.post(`/chants/${chantId}/child/${childId}/complete`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default chantProgressService;

