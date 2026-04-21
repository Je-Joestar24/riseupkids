import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  archiveStarCamMission,
  clearCurrentStarCamMission,
  clearStarCamMissionAdminError,
  createStarCamCategory,
  createStarCamMission,
  fetchStarCamCategories,
  fetchStarCamMissionById,
  fetchStarCamMissions,
  addStarCamMissionVocabulary,
  updateStarCamMissionVocabulary,
  deleteStarCamMissionVocabulary,
  uploadStarCamMissionImage,
  uploadStarCamMissionMedia,
  publishStarCamMission,
  resetStarCamMissionAdminState,
  selectStarCamMissionAdmin,
  setStarCamMissionAdminFilters,
  unpublishStarCamMission,
  updateStarCamMission,
  updateStarCamMissionItem,
  deleteStarCamMissionItem,
} from '../store/slices/starCamMissionAdminSlice';
import { showNotification } from '../store/slices/uiSlice';

export const useStarCamMissionAdmin = () => {
  const dispatch = useDispatch();
  const state = useSelector(selectStarCamMissionAdmin);

  const runThunk = useCallback(
    async (thunkAction, errorMessage, successConfig) => {
      try {
        const result = await dispatch(thunkAction).unwrap();
        if (successConfig?.enabled !== false && successConfig?.message) {
          dispatch(showNotification({ message: successConfig.message, type: 'success' }));
        }
        return result;
      } catch (error) {
        dispatch(showNotification({ message: error || errorMessage, type: 'error' }));
        throw error;
      }
    },
    [dispatch]
  );

  const loadCategories = useCallback(
    (params = {}) =>
      runThunk(fetchStarCamCategories(params), 'Failed to load Star Cam categories'),
    [runThunk]
  );

  const addCategory = useCallback(
    (payload) =>
      runThunk(createStarCamCategory(payload), 'Failed to create Star Cam category', { message: 'Category created successfully' }),
    [runThunk]
  );

  const loadMissions = useCallback(
    (params = {}) =>
      runThunk(fetchStarCamMissions(params), 'Failed to load Star Cam missions'),
    [runThunk]
  );

  const addMission = useCallback(
    (payload, options = {}) =>
      runThunk(createStarCamMission(payload), 'Failed to create Star Cam mission', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Mission created successfully',
      }),
    [runThunk]
  );

  const loadMissionById = useCallback(
    (missionId) =>
      runThunk(fetchStarCamMissionById(missionId), 'Failed to load Star Cam mission'),
    [runThunk]
  );

  const editMission = useCallback(
    (missionId, payload, options = {}) =>
      runThunk(updateStarCamMission({ missionId, payload }), 'Failed to update Star Cam mission', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Mission updated successfully',
      }),
    [runThunk]
  );

  const updateMissionImage = useCallback(
    (missionId, missionImage) =>
      editMission(missionId, {
        missionImage: missionImage || null,
      }),
    [editMission]
  );

  const editMissionItem = useCallback(
    (missionId, sortOrder, payload) =>
      runThunk(
        updateStarCamMissionItem({ missionId, sortOrder, payload }),
        'Failed to update mission item',
        'Mission item updated successfully'
      ),
    [runThunk]
  );

  const removeMissionItem = useCallback(
    (missionId, sortOrder) =>
      runThunk(
        deleteStarCamMissionItem({ missionId, sortOrder }),
        'Failed to delete mission item',
        'Mission item deleted successfully'
      ),
    [runThunk]
  );

  const updateMissionMedia = useCallback(
    (missionId, { shortVideoFile, rewardAudioFile, rewardVideoFile }, options = {}) =>
      runThunk(
        uploadStarCamMissionMedia({ missionId, shortVideoFile, rewardAudioFile, rewardVideoFile }),
        'Failed to upload mission media',
        {
          enabled: options.notifySuccess !== false,
          message: options.successMessage || 'Mission media updated successfully',
        }
      ),
    [runThunk]
  );

  const addMissionVocabulary = useCallback(
    (missionId, payload) =>
      runThunk(
        addStarCamMissionVocabulary({ missionId, payload }),
        'Failed to add vocabulary',
        'Vocabulary added successfully'
      ),
    [runThunk]
  );

  const editMissionVocabulary = useCallback(
    (missionId, sortOrder, payload) =>
      runThunk(
        updateStarCamMissionVocabulary({ missionId, sortOrder, payload }),
        'Failed to update vocabulary',
        'Vocabulary updated successfully'
      ),
    [runThunk]
  );

  const removeMissionVocabulary = useCallback(
    (missionId, sortOrder) =>
      runThunk(
        deleteStarCamMissionVocabulary({ missionId, sortOrder }),
        'Failed to delete vocabulary',
        'Vocabulary deleted successfully'
      ),
    [runThunk]
  );

  const uploadMissionImage = useCallback(
    (missionId, imageFile, options = {}) =>
      runThunk(
        uploadStarCamMissionImage({ missionId, imageFile }),
        'Failed to upload mission image',
        {
          enabled: options.notifySuccess !== false,
          message: options.successMessage || 'Mission image uploaded successfully',
        }
      ),
    [runThunk]
  );

  const publishMission = useCallback(
    (missionId) =>
      runThunk(publishStarCamMission(missionId), 'Failed to publish Star Cam mission', 'Mission published successfully'),
    [runThunk]
  );

  const unpublishMission = useCallback(
    (missionId) =>
      runThunk(unpublishStarCamMission(missionId), 'Failed to unpublish Star Cam mission', 'Mission moved to draft'),
    [runThunk]
  );

  const archiveMission = useCallback(
    (missionId) =>
      runThunk(archiveStarCamMission(missionId), 'Failed to archive Star Cam mission', 'Mission archived successfully'),
    [runThunk]
  );

  const updateFilters = useCallback(
    (filters) => {
      dispatch(setStarCamMissionAdminFilters(filters));
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearStarCamMissionAdminError());
  }, [dispatch]);

  const clearCurrentMission = useCallback(() => {
    dispatch(clearCurrentStarCamMission());
  }, [dispatch]);

  const resetState = useCallback(() => {
    dispatch(resetStarCamMissionAdminState());
  }, [dispatch]);

  return useMemo(
    () => ({
      ...state,
      loadCategories,
      addCategory,
      loadMissions,
      addMission,
      loadMissionById,
      editMission,
      editMissionItem,
      removeMissionItem,
      updateMissionImage,
      updateMissionMedia,
      uploadMissionImage,
      addMissionVocabulary,
      editMissionVocabulary,
      removeMissionVocabulary,
      publishMission,
      unpublishMission,
      archiveMission,
      updateFilters,
      clearError,
      clearCurrentMission,
      resetState,
    }),
    [
      state,
      loadCategories,
      addCategory,
      loadMissions,
      addMission,
      loadMissionById,
      editMission,
      editMissionItem,
      removeMissionItem,
      updateMissionImage,
      updateMissionMedia,
      uploadMissionImage,
      addMissionVocabulary,
      editMissionVocabulary,
      removeMissionVocabulary,
      publishMission,
      unpublishMission,
      archiveMission,
      updateFilters,
      clearError,
      clearCurrentMission,
      resetState,
    ]
  );
};

export default useStarCamMissionAdmin;

