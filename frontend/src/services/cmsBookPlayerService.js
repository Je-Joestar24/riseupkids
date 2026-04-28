import api from '../api/axios';

const BASE_PATH = '/parent/cms-books';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const cmsBookPlayerService = {
  listPlayableBooks: async (params = {}) => {
    try {
      const response = await api.get(`${BASE_PATH}/playable`, { params });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load playable books');
    }
  },

  getPlayableBookById: async (bookId) => {
    try {
      const response = await api.get(`${BASE_PATH}/${bookId}/play`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load playable book');
    }
  },
};

export default cmsBookPlayerService;
