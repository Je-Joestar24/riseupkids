import api from '../api/axios';
import { BASE_PATH, ExperienceApiError, pathFor, toExperienceApiError } from './experienceAdminService';

/**
 * The calls of the Experience add / edit page (/api/admin/experiences): load one experience, create one, save
 * one. Kept apart from the list service so the list (which is in the first download) does not carry them.
 *
 * Failures are thrown as `ExperienceApiError`, like the rest of the Experiences service.
 */

// The pictures travel with the text, so the form is sent as multipart (axios adds the boundary).
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

const experienceEditorService = {
  /**
   * One experience with everything the editor needs (videos with their ids and positions, the printable).
   * @returns {Promise<object>}
   */
  getExperience: async (uuid) => {
    try {
      const response = await api.get(pathFor(uuid));
      const experience = response.data?.data;
      if (!experience || typeof experience !== 'object') {
        throw new ExperienceApiError('The server sent an answer that could not be read.', { status: response.status || null, code: 'BAD_RESPONSE' });
      }
      return experience;
    } catch (error) {
      throw toExperienceApiError(error, 'Could not load the experience.');
    }
  },

  /**
   * @param {FormData} formData see `buildFormData` (utils/experienceForm.js)
   * @returns {Promise<{ experience: object, message: string }>}
   */
  createExperience: async (formData) => {
    try {
      const response = await api.post(BASE_PATH, formData, MULTIPART);
      return { experience: response.data?.data, message: response.data?.message || 'Experience created.' };
    } catch (error) {
      throw toExperienceApiError(error, 'Could not create the experience.');
    }
  },

  /**
   * @param {string} uuid
   * @param {FormData} formData see `buildFormData` (utils/experienceForm.js)
   * @returns {Promise<{ experience: object, message: string }>}
   */
  updateExperience: async (uuid, formData) => {
    try {
      const response = await api.put(pathFor(uuid), formData, MULTIPART);
      return { experience: response.data?.data, message: response.data?.message || 'Experience updated.' };
    } catch (error) {
      throw toExperienceApiError(error, 'Could not save the experience.');
    }
  },
};

export default experienceEditorService;
