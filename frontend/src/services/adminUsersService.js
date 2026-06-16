import api from '../api/axios';
import { USER_ROLES } from '../config/constants';

const ROLE_API_BASE = {
  [USER_ROLES.PARENT]: '/parents',
  [USER_ROLES.TEACHER]: '/teachers',
  [USER_ROLES.CONTENT_CREATOR]: '/content-creators',
};

const getBasePath = (role) => {
  const base = ROLE_API_BASE[role];
  if (!base) {
    throw new Error('Unsupported user role');
  }
  return base;
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

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
      throw getErrorMessage(error, 'Failed to fetch users');
    }
  },

  getUserById: async (userId, role = USER_ROLES.PARENT) => {
    try {
      const response = await api.get(`${getBasePath(role)}/${userId}`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to fetch user');
    }
  },

  createUser: async ({ role = USER_ROLES.PARENT, name, email, password }) => {
    try {
      const response = await api.post(getBasePath(role), { name, email, password });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to create user');
    }
  },

  updateUser: async (userId, role, updateData) => {
    try {
      const response = await api.put(`${getBasePath(role)}/${userId}`, updateData);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to update user');
    }
  },

  archiveUser: async (userId, role) => {
    try {
      const response = await api.delete(`${getBasePath(role)}/${userId}`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to archive user');
    }
  },

  restoreUser: async (userId, role) => {
    try {
      const response = await api.put(`${getBasePath(role)}/${userId}/restore`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to restore user');
    }
  },
};

export default adminUsersService;
