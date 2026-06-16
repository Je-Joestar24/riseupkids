import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllParents,
  fetchParentById,
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentParent,
} from '../store/slices/parentsSlice';
import { showNotification } from '../store/slices/uiSlice';
import { getAdminUserRoleLabel } from '../utils/adminUserRoles';

export const useParents = () => {
  const dispatch = useDispatch();
  const {
    parents,
    currentParent,
    pagination,
    filters,
    loading,
    error,
  } = useSelector((state) => state.parents);

  const resolveRole = (role) => role || filters.role;

  const fetchParents = async (params = null) => {
    try {
      const queryParams = params || filters;
      return await dispatch(fetchAllParents(queryParams)).unwrap();
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to fetch users', type: 'error' }));
      throw err;
    }
  };

  const fetchParent = async (userId, role = filters.role) => {
    try {
      return await dispatch(fetchParentById({ userId, role: resolveRole(role) })).unwrap();
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to fetch user', type: 'error' }));
      throw err;
    }
  };

  const createNewParent = async (userData) => {
    try {
      const result = await dispatch(createParent(userData)).unwrap();
      const roleLabel = getAdminUserRoleLabel(userData.role);
      dispatch(showNotification({ message: `${roleLabel} created successfully!`, type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to create user', type: 'error' }));
      throw err;
    }
  };

  const updateParentData = async (userId, updateData, role = filters.role) => {
    try {
      const result = await dispatch(
        updateParent({ parentId: userId, role: resolveRole(role), updateData })
      ).unwrap();
      dispatch(showNotification({ message: 'User updated successfully!', type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to update user', type: 'error' }));
      throw err;
    }
  };

  const archiveParentData = async (userId, role = filters.role) => {
    try {
      const result = await dispatch(
        archiveParent({ userId, role: resolveRole(role) })
      ).unwrap();
      dispatch(showNotification({ message: 'User archived successfully', type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to archive user', type: 'error' }));
      throw err;
    }
  };

  const restoreParentData = async (userId, role = filters.role) => {
    try {
      const result = await dispatch(
        restoreParent({ userId, role: resolveRole(role) })
      ).unwrap();
      dispatch(showNotification({ message: 'User restored successfully!', type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to restore user', type: 'error' }));
      throw err;
    }
  };

  const updateFilters = (newFilters) => {
    dispatch(setFilters(newFilters));
  };

  const resetFilters = () => {
    dispatch(clearFilters());
  };

  const clearParent = () => {
    dispatch(clearCurrentParent());
  };

  const clearParentsError = () => {
    dispatch(clearError());
  };

  return {
    parents,
    users: parents,
    currentParent,
    currentUser: currentParent,
    pagination,
    filters,
    loading,
    error,
    fetchParents,
    fetchUsers: fetchParents,
    fetchParent,
    fetchUser: fetchParent,
    createNewParent,
    createUser: createNewParent,
    updateParentData,
    updateUserData: updateParentData,
    archiveParentData,
    archiveUserData: archiveParentData,
    restoreParentData,
    restoreUserData: restoreParentData,
    updateFilters,
    resetFilters,
    clearParent,
    clearParentsError,
  };
};

export default useParents;
