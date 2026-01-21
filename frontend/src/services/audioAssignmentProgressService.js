import api from '../api/axios';

const audioAssignmentProgressService = {
  start: async (audioAssignmentId, childId) => {
    const response = await api.post(`/audio-assignments/${audioAssignmentId}/child/${childId}/start`);
    return response.data;
  },

  getProgress: async (audioAssignmentId, childId) => {
    const response = await api.get(`/audio-assignments/${audioAssignmentId}/child/${childId}/progress`);
    return response.data;
  },

  submit: async (audioAssignmentId, childId, formData) => {
    const response = await api.post(
      `/audio-assignments/${audioAssignmentId}/child/${childId}/submit`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  listSubmissions: async (params = {}) => {
    const response = await api.get('/audio-assignments/submissions', { params });
    return response.data;
  },

  review: async (audioAssignmentId, childId, { decision, feedback }) => {
    const response = await api.post(`/audio-assignments/${audioAssignmentId}/child/${childId}/review`, {
      decision,
      feedback,
    });
    return response.data;
  },
};

export default audioAssignmentProgressService;

