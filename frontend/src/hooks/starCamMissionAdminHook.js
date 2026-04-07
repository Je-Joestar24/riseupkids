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
  publishStarCamMission,
  resetStarCamMissionAdminState,
  selectStarCamMissionAdmin,
  setStarCamMissionAdminFilters,
  unpublishStarCamMission,
  updateStarCamMission,
} from '../store/slices/starCamMissionAdminSlice';
import { showNotification } from '../store/slices/uiSlice';

export const useStarCamMissionAdmin = () => {
  const dispatch = useDispatch();
  const state = useSelector(selectStarCamMissionAdmin);

  const runThunk = useCallback(
    async (thunkAction, errorMessage, successMessage) => {
      try {
        const result = await dispatch(thunkAction).unwrap();
        if (successMessage) {
          dispatch(showNotification({ message: successMessage, type: 'success' }));
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
      runThunk(createStarCamCategory(payload), 'Failed to create Star Cam category', 'Category created successfully'),
    [runThunk]
  );

  const loadMissions = useCallback(
    (params = {}) =>
      runThunk(fetchStarCamMissions(params), 'Failed to load Star Cam missions'),
    [runThunk]
  );

  const addMission = useCallback(
    (payload) =>
      runThunk(createStarCamMission(payload), 'Failed to create Star Cam mission', 'Mission created successfully'),
    [runThunk]
  );

  const loadMissionById = useCallback(
    (missionId) =>
      runThunk(fetchStarCamMissionById(missionId), 'Failed to load Star Cam mission'),
    [runThunk]
  );

  const editMission = useCallback(
    (missionId, payload) =>
      runThunk(updateStarCamMission({ missionId, payload }), 'Failed to update Star Cam mission', 'Mission updated successfully'),
    [runThunk]
  );

  const updateMissionImage = useCallback(
    (missionId, missionImage) =>
      editMission(missionId, {
        missionImage: missionImage || null,
      }),
    [editMission]
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
      updateMissionImage,
      addMissionVocabulary,
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
      updateMissionImage,
      addMissionVocabulary,
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

