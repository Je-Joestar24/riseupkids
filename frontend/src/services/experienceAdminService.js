import api from '../api/axios';

/**
 * Admin Experiences service (/api/admin/experiences).
 *
 * Every failure is thrown as an `ExperienceApiError` carrying what the backend said (`status`, the stable
 * `code`, the field-level `errors`), so a screen can answer "already deleted" differently from "cannot be
 * published yet" or "the server is unreachable", instead of showing one vague message.
 */

export const BASE_PATH = '/admin/experiences';

export const EXPERIENCE_STATUS = Object.freeze({
  ALL: 'all',
  PUBLISHED: 'published',
  DRAFT: 'draft',
});

export const EXPERIENCE_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'EXPERIENCE_NOT_FOUND',
  PUBLISH_BLOCKED: 'PUBLISH_BLOCKED',
  CONFLICT: 'EXPERIENCE_CONFLICT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
});

const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';

export class ExperienceApiError extends Error {
  /**
   * @param {string} message readable message
   * @param {{ status?: number|null, code?: string|null, errors?: Array<{field:string,message:string}>, requestId?: string|null }} [details]
   */
  constructor(message, { status = null, code = null, errors = [], requestId = null } = {}) {
    super(message);
    this.name = 'ExperienceApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.requestId = requestId;
  }
}

/**
 * @param {unknown} error whatever axios threw
 * @param {string} fallback message when the backend gave none
 * @returns {ExperienceApiError}
 */
export const toExperienceApiError = (error, fallback) => {
  if (error instanceof ExperienceApiError) return error;
  const response = error && error.response;
  if (!response) {
    // No answer at all: offline, DNS, CORS, timeout.
    return new ExperienceApiError(NETWORK_MESSAGE, { status: null, code: 'NETWORK_ERROR' });
  }
  const data = response.data && typeof response.data === 'object' ? response.data : {};
  return new ExperienceApiError(data.message || fallback, {
    status: response.status,
    code: data.code || null,
    errors: Array.isArray(data.errors) ? data.errors : [],
    requestId: data.requestId || null,
  });
};

/** Query for the list: nothing is sent for a default value, so the address stays short. */
export const buildListParams = ({ status, search, page, limit } = {}) => {
  const params = {};
  if (status && status !== EXPERIENCE_STATUS.ALL) params.status = status;
  const text = typeof search === 'string' ? search.trim() : '';
  if (text) params.search = text;
  if (Number.isInteger(page) && page > 1) params.page = page;
  if (Number.isInteger(limit) && limit > 0) params.limit = limit;
  return params;
};

const emptyCounts = { all: 0, published: 0, draft: 0 };

export const pathFor = (uuid, suffix = '') => `${BASE_PATH}/${encodeURIComponent(String(uuid))}${suffix}`;

const experienceAdminService = {
  /**
   * @param {{ status?: string, search?: string, page?: number, limit?: number }} [filters]
   * @returns {Promise<{ items: object[], pagination: { page: number, limit: number, total: number, pages: number }, counts: { all: number, published: number, draft: number } }>}
   */
  listExperiences: async (filters = {}) => {
    try {
      const response = await api.get(BASE_PATH, { params: buildListParams(filters) });
      const body = response.data || {};
      const items = Array.isArray(body.data) ? body.data : [];
      const pagination = body.pagination || { page: 1, limit: items.length, total: items.length, pages: 1 };
      return { items, pagination, counts: { ...emptyCounts, ...(body.counts || {}) } };
    } catch (error) {
      throw toExperienceApiError(error, 'Could not load the experiences.');
    }
  },

  /** @returns {Promise<{ experience: object, message: string }>} */
  publishExperience: async (uuid) => {
    try {
      const response = await api.patch(pathFor(uuid, '/publish'));
      return { experience: response.data?.data, message: response.data?.message || 'Experience published.' };
    } catch (error) {
      throw toExperienceApiError(error, 'Could not publish the experience.');
    }
  },

  /** @returns {Promise<{ experience: object, message: string }>} */
  unpublishExperience: async (uuid) => {
    try {
      const response = await api.patch(pathFor(uuid, '/unpublish'));
      return { experience: response.data?.data, message: response.data?.message || 'Experience unpublished.' };
    } catch (error) {
      throw toExperienceApiError(error, 'Could not unpublish the experience.');
    }
  },

  /** @returns {Promise<{ uuid: string, title: string }>} */
  deleteExperience: async (uuid) => {
    try {
      const response = await api.delete(pathFor(uuid));
      return response.data?.data || { uuid, title: '' };
    } catch (error) {
      throw toExperienceApiError(error, 'Could not delete the experience.');
    }
  },
};

export default experienceAdminService;
