import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllParents,
  fetchParentById,
  createParent,
  updateParent,
  fetchAccessAreas,
  setCreatorAccess,
  setCreatorAccessBulk,
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
    accessAreas: accessAreaOptions,
    accessSaving,
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
      dispatch(showNotification({ message: err?.message || err || 'Failed to create user', type: 'error' }));
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
      dispatch(showNotification({ message: err?.message || err || 'Failed to update user', type: 'error' }));
      throw err;
    }
  };

  /**
   * Loads the access checkboxes once (asking again while loaded does nothing). A failure is NOT shown as a notice: the
   * checkboxes show it themselves, next to a Retry, and it is kept in `accessAreaOptions.error`.
   */
  const loadAccessAreas = async () => {
    try {
      return await dispatch(fetchAccessAreas()).unwrap();
    } catch (err) {
      // Already loaded or loading: nothing to do
      if (err?.name === 'ConditionError') return null;
      throw err;
    }
  };

  /**
   * Manage access for one content creator. Success shows a notice; a refusal is thrown as { message, code, status }
   * WITHOUT a notice, because the dialog that asked shows it inline and stays open.
   */
  const setCreatorAccessData = async (userId, accessAreas) => {
    const result = await dispatch(setCreatorAccess({ userId, accessAreas })).unwrap();
    dispatch(
      showNotification({
        message: result.changed ? 'Access updated successfully' : 'Access was already set this way',
        type: 'success',
      })
    );
    return result;
  };

  /** Bulk manage access: the same list for every chosen creator. Same rules as above. */
  const setCreatorAccessBulkData = async (ids, accessAreas) => {
    const result = await dispatch(setCreatorAccessBulk({ ids, accessAreas })).unwrap();
    dispatch(showNotification({ message: result.message || 'Access updated successfully', type: 'success' }));
    return result;
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
    accessAreaOptions,
    accessSaving,
    loadAccessAreas,
    setCreatorAccessData,
    setCreatorAccessBulkData,
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
