import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllContentCreators,
  fetchContentCreatorById,
  createContentCreator,
  updateContentCreator,
  archiveContentCreator,
  restoreContentCreator,
  clearError,
  setFilters,
  clearFilters,
  clearCurrentContentCreator,
} from '../store/slices/contentCreatorSlice';
import { showNotification } from '../store/slices/uiSlice';

export const useContentCreators = () => {
  const dispatch = useDispatch();
  const { contentCreators, currentContentCreator, pagination, filters, loading, error } = useSelector(
    (state) => state.contentCreators
  );

  const fetchContentCreators = async (params = null) => {
    try {
      const queryParams = params || filters;
      return await dispatch(fetchAllContentCreators(queryParams)).unwrap();
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to fetch content creators', type: 'error' }));
      throw err;
    }
  };

  const fetchContentCreator = async (contentCreatorId) => {
    try {
      return await dispatch(fetchContentCreatorById(contentCreatorId)).unwrap();
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to fetch content creator', type: 'error' }));
      throw err;
    }
  };

  const createNewContentCreator = async (contentCreatorData) => {
    try {
      const result = await dispatch(createContentCreator(contentCreatorData)).unwrap();
      dispatch(showNotification({ message: 'Content creator created successfully!', type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to create content creator', type: 'error' }));
      throw err;
    }
  };

  const updateContentCreatorData = async (contentCreatorId, updateData) => {
    try {
      const result = await dispatch(updateContentCreator({ contentCreatorId, updateData })).unwrap();
      dispatch(showNotification({ message: 'Content creator updated successfully!', type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to update content creator', type: 'error' }));
      throw err;
    }
  };

  const archiveContentCreatorData = async (contentCreatorId) => {
    try {
      const result = await dispatch(archiveContentCreator(contentCreatorId)).unwrap();
      dispatch(showNotification({ message: 'Content creator archived successfully', type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to archive content creator', type: 'error' }));
      throw err;
    }
  };

  const restoreContentCreatorData = async (contentCreatorId) => {
    try {
      const result = await dispatch(restoreContentCreator(contentCreatorId)).unwrap();
      dispatch(showNotification({ message: 'Content creator restored successfully!', type: 'success' }));
      return result;
    } catch (err) {
      dispatch(showNotification({ message: err || 'Failed to restore content creator', type: 'error' }));
      throw err;
    }
  };

  const updateFilters = (newFilters) => dispatch(setFilters(newFilters));
  const resetFilters = () => dispatch(clearFilters());
  const clearContentCreator = () => dispatch(clearCurrentContentCreator());
  const clearContentCreatorsError = () => dispatch(clearError());

  return {
    contentCreators,
    currentContentCreator,
    pagination,
    filters,
    loading,
    error,
    fetchContentCreators,
    fetchContentCreator,
    createNewContentCreator,
    updateContentCreatorData,
    archiveContentCreatorData,
    restoreContentCreatorData,
    updateFilters,
    resetFilters,
    clearContentCreator,
    clearContentCreatorsError,
  };
};

export default useContentCreators;
