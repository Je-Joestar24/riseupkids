import api from '../api/axios';
import { EXPERIENCE_DETAIL_FAILED_MESSAGE, EXPERIENCE_NOT_FOUND_MESSAGE } from '../utils/experienceChildFormat';

/**
 * Experience Service (child side, read only)
 *
 * The experiences an admin has published, shown under Explore. The server only ever returns published
 * ones, so nothing here needs to filter.
 *
 * - GET /api/experiences         - the cards: uuid, title, description, coverImage, videoCount
 * - GET /api/experiences/:uuid   - one experience: videos in order and the printable
 *
 * Failures are thrown as readable text, like the other services.
 */

const experienceChildService = {
  /**
   * @returns {Promise<Array<{ uuid: string, title: string, description: string, coverImage: string|null, videoCount: number }>>}
   */
  getPublishedExperiences: async () => {
    let response;
    try {
      response = await api.get('/experiences');
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
    const list = response?.data?.data;
    // Anything but a list (an HTML error page from a proxy, for example) is a failed load, not "no experiences".
    if (!Array.isArray(list)) throw 'We could not load the experiences. Please try again.';
    return list;
  },

  /**
   * One published experience. A draft, a deleted one and an unknown id all come back as "not found" (404), which
   * is thrown as EXPERIENCE_NOT_FOUND_MESSAGE so the page can show "not available" instead of "try again".
   * @param {string} uuid
   */
  getPublishedExperience: async (uuid) => {
    let response;
    try {
      response = await api.get(`/experiences/${encodeURIComponent(uuid)}`);
    } catch (error) {
      if (error.response?.status === 404) throw EXPERIENCE_NOT_FOUND_MESSAGE;
      throw error.response?.data?.message || error.message;
    }
    const detail = response?.data?.data;
    // Anything but an experience with a list of videos (an HTML error page from a proxy, for example) is a failed load.
    if (!detail || typeof detail !== 'object' || !Array.isArray(detail.videos)) throw EXPERIENCE_DETAIL_FAILED_MESSAGE;
    return detail;
  },
};

export default experienceChildService;
