import api from '../api/axios';
import { USER_ROLES } from '../config/constants';
import { accessErrorMessage, NETWORK_MESSAGE } from '../utils/accessErrors';

const ROLE_API_BASE = {
  [USER_ROLES.PARENT]: '/parents',
  [USER_ROLES.TEACHER]: '/teachers',
  [USER_ROLES.CONTENT_CREATOR]: '/content-creators',
};

const CREATORS_BASE = ROLE_API_BASE[USER_ROLES.CONTENT_CREATOR];

const getBasePath = (role) => {
  const base = ROLE_API_BASE[role];
  if (!base) {
    throw new Error('Unsupported user role');
  }
  return base;
};

/**
 * What every failed call throws. `message` is already a plain sentence the screen can show; `code` is the server's
 * short code (the screen decides things by it, never by the wording); `status` is the HTTP status, null when the
 * server could not be reached.
 */
export class AdminUserApiError extends Error {
  constructor(message, { status = null, code = null, requestId = null } = {}) {
    super(message);
    this.name = 'AdminUserApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/**
 * @param {unknown} error whatever axios threw
 * @param {string} fallback sentence when the server gave none
 * @returns {AdminUserApiError}
 */
export const toAdminUserApiError = (error, fallback) => {
  if (error instanceof AdminUserApiError) return error;
  const response = error && error.response;
  if (!response) {
    // No answer at all: offline, DNS, CORS, a timeout.
    return new AdminUserApiError(NETWORK_MESSAGE, { status: null, code: 'NETWORK_ERROR' });
  }
  const data = response.data && typeof response.data === 'object' ? response.data : {};
  return new AdminUserApiError(accessErrorMessage(data.code, data.message, fallback), {
    status: response.status,
    code: typeof data.code === 'string' ? data.code : null,
    requestId: data.requestId || null,
  });
};

const isCreatorRole = (role) => role === USER_ROLES.CONTENT_CREATOR;

/**
 * Admin Users Service — routes to role-specific APIs (parent, teacher, content_creator)
 */
const adminUsersService = {
  getUsers: async (params = {}) => {
    const { role = USER_ROLES.PARENT, ...query } = params;
    try {
      const response = await api.get(getBasePath(role), { params: query });
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to fetch users');
    }
  },

  getUserById: async (userId, role = USER_ROLES.PARENT) => {
    try {
      const response = await api.get(`${getBasePath(role)}/${userId}`);
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to fetch user');
    }
  },

  /**
   * A content creator is sent with her access areas (the server requires them); anyone else never is.
   */
  createUser: async ({ role = USER_ROLES.PARENT, name, email, password, accessAreas }) => {
    try {
      const body = { name, email, password };
      if (isCreatorRole(role)) body.accessAreas = accessAreas;
      const response = await api.post(getBasePath(role), body);
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to create user');
    }
  },

  updateUser: async (userId, role, updateData) => {
    try {
      let body = updateData;
      if (!isCreatorRole(role) && updateData && 'accessAreas' in updateData) {
        // Only a content creator has access areas: never send them for anyone else
        const { accessAreas: _ignored, ...rest } = updateData;
        body = rest;
      }
      const response = await api.put(`${getBasePath(role)}/${userId}`, body);
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to update user');
    }
  },

  archiveUser: async (userId, role) => {
    try {
      const response = await api.delete(`${getBasePath(role)}/${userId}`);
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to archive user');
    }
  },

  restoreUser: async (userId, role) => {
    try {
      const response = await api.put(`${getBasePath(role)}/${userId}/restore`);
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to restore user');
    }
  },

  /** The checkboxes to draw and which of them current creators have: { areas: [{key,label,help,legacy}], legacyAreas }. */
  getAccessAreas: async () => {
    try {
      const response = await api.get(`${CREATORS_BASE}/access-areas`);
      return response.data.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to load the access areas');
    }
  },

  /** Manage access: replaces one creator's list. Answers { data: creator, previousAccessAreas, changed }. */
  setCreatorAccess: async (userId, accessAreas) => {
    try {
      const response = await api.put(`${CREATORS_BASE}/${userId}/access`, { accessAreas });
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to update access');
    }
  },

  /** Bulk manage access: gives every chosen creator the same list. Answers { data: [...], matched, changed }. */
  setCreatorAccessBulk: async (ids, accessAreas) => {
    try {
      const response = await api.put(`${CREATORS_BASE}/access/bulk`, { ids, accessAreas });
      return response.data;
    } catch (error) {
      throw toAdminUserApiError(error, 'Failed to update access');
    }
  },
};

export default adminUsersService;
