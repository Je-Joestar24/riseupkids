import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Grid, Paper, Typography } from '@mui/material';
import StarCamMissionHeader from '../../components/admin/starcammission/StarCamMissionHeader';
import StarCamMissionFilters from '../../components/admin/starcammission/StarCamMissionFilters';
import StarCamMissionTable from '../../components/admin/starcammission/StarCamMissionTable';
import StarCamMissionTablePaginations from '../../components/admin/starcammission/StarCamMissionTablePaginations';
import StarCamRightPanelPreviewEdit from '../../components/admin/starcammission/StarCamRightPanelPreviewEdit';
import StarCamMissionCreateModal from '../../components/admin/starcammission/StarCamMissionCreateModal';
import useStarCamMissionAdmin from '../../hooks/starCamMissionAdminHook';
import { showConfirmationDialog, showNotification } from '../../store/slices/uiSlice';

const AdminStarCamMissions = () => {
  const dispatch = useDispatch();
  const {
    categories,
    missions,
    pagination,
    filters,
    loading,
    currentMission,
    error,
    loadCategories,
    loadMissions,
    loadMissionById,
    addMissionVocabulary,
    editMissionVocabulary,
    removeMissionVocabulary,
    addMission,
    editMission,
    uploadMissionImage,
    updateMissionMedia,
    publishMission,
    unpublishMission,
    archiveMission,
    updateFilters,
    clearCurrentMission,
  } = useStarCamMissionAdmin();
  const [newVocab, setNewVocab] = React.useState({
    displayText: '',
    target: '',
    imageFile: null,
    audioFile: null,
    tryAgainAudioFile: null,
    successAudioFile: null,
    pronunciationVideoFile: null,
  });
  const [openCreateModal, setOpenCreateModal] = React.useState(false);
  const [editingMission, setEditingMission] = React.useState(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadMissions({
      page: filters.page,
      limit: filters.limit,
      status: filters.status || undefined,
      search: filters.search || undefined,
      categoryId: filters.categoryId || undefined,
    });
  }, [loadMissions, filters.page, filters.limit, filters.status, filters.search, filters.categoryId]);

  const handleToggleMission = async (missionId, checked) => {
    if (checked) {
      await loadMissionById(missionId);
      return;
    }
    if (currentMission?._id === missionId) {
      clearCurrentMission();
    }
  };

  const handleSubmitVocabulary = async () => {
    if (!currentMission?._id) return;
    const existing = Array.isArray(currentMission.vocab) ? currentMission.vocab : [];
    if (existing.length >= 7) return;
    const displayText = String(newVocab.displayText || '').trim();
    const target = String(newVocab.target || '').trim().toLowerCase();
    if (!displayText || !target || !newVocab.imageFile || !newVocab.audioFile || !newVocab.tryAgainAudioFile || !newVocab.successAudioFile) {
      return;
    }

    await addMissionVocabulary(currentMission._id, {
      displayText,
      target,
      imageFile: newVocab.imageFile,
      audioFile: newVocab.audioFile,
      tryAgainAudioFile: newVocab.tryAgainAudioFile,
      successAudioFile: newVocab.successAudioFile,
      pronunciationVideoFile: newVocab.pronunciationVideoFile || undefined,
    });
    await loadMissionById(currentMission._id);
    setNewVocab({
      displayText: '',
      target: '',
      imageFile: null,
      audioFile: null,
      tryAgainAudioFile: null,
      successAudioFile: null,
      pronunciationVideoFile: null,
    });
  };

  const handleEditVocabulary = async (missionId, sortOrder, payload) => {
    if (!missionId) return;
    const safePayload = {
      displayText: String(payload?.displayText || '').trim(),
      target: String(payload?.target || '').trim().toLowerCase(),
      imageFile: payload?.imageFile || undefined,
      audioFile: payload?.audioFile || undefined,
      introAudioFile: payload?.introAudioFile || undefined,
      tryAgainAudioFile: payload?.tryAgainAudioFile || undefined,
      successAudioFile: payload?.successAudioFile || undefined,
      pronunciationVideoFile: payload?.pronunciationVideoFile || undefined,
    };
    await editMissionVocabulary(missionId, sortOrder, safePayload);
    await loadMissionById(missionId);
  };

  const handleDeleteVocabularyConfirm = (vocab) => {
    if (!currentMission?._id || vocab?.sortOrder == null) return;
    dispatch(
      showConfirmationDialog({
        title: 'Delete Vocabulary?',
        message: `This will permanently remove "${vocab?.displayText || vocab?.word || 'this vocabulary'}" from the mission.`,
        type: 'warning',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          await removeMissionVocabulary(currentMission._id, vocab.sortOrder);
          await loadMissionById(currentMission._id);
        },
      })
    );
  };

  const missionQueryParams = {
    page: filters.page,
    limit: filters.limit,
    status: filters.status || undefined,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
  };

  const handleCreateMission = async ({ title, categoryId, missionImageFile, missionShortVideoFile, rewardAudioFile, rewardVideoFile }) => {
    const created = await addMission(
      { title, categoryId },
      { notifySuccess: false }
    );
    const createdMissionId = created?.data?._id;
    if (createdMissionId && missionImageFile) {
      await uploadMissionImage(createdMissionId, missionImageFile, { notifySuccess: false });
    }
    if (createdMissionId && (missionShortVideoFile || rewardAudioFile || rewardVideoFile)) {
      await updateMissionMedia(createdMissionId, {
        shortVideoFile: missionShortVideoFile,
        rewardAudioFile,
        rewardVideoFile,
      }, { notifySuccess: false });
    }
    await loadMissions(missionQueryParams);
    dispatch(showNotification({ message: 'Mission upload completed successfully', type: 'success' }));
  };

  const handleEditMission = async (
    missionId,
    { title, categoryId, missionImageFile, missionShortVideoFile, rewardAudioFile, rewardVideoFile }
  ) => {
    await editMission(missionId, { title, categoryId }, { notifySuccess: false });
    if (missionImageFile) {
      await uploadMissionImage(missionId, missionImageFile, { notifySuccess: false });
    }
    if (missionShortVideoFile || rewardAudioFile || rewardVideoFile) {
      await updateMissionMedia(missionId, {
        shortVideoFile: missionShortVideoFile,
        rewardAudioFile,
        rewardVideoFile,
      }, { notifySuccess: false });
    }
    await loadMissions(missionQueryParams);
    if (currentMission?._id === missionId) {
      await loadMissionById(missionId);
    }
    dispatch(showNotification({ message: 'Mission upload completed successfully', type: 'success' }));
  };

  const handleOpenCreateMissionModal = () => {
    setEditingMission(null);
    setOpenCreateModal(true);
  };

  const handleOpenEditMissionModal = async (mission) => {
    if (!mission?._id) return;
    const response = await loadMissionById(mission._id);
    setEditingMission(response?.data || mission);
    setOpenCreateModal(true);
  };

  const handleCloseMissionModal = () => {
    setOpenCreateModal(false);
    setEditingMission(null);
  };

  const isDetailsMode = Boolean(currentMission?._id);

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      <StarCamMissionHeader
        selectedMission={currentMission}
        totalMissions={pagination?.total || missions.length}
        onClearSelection={clearCurrentMission}
        onOpenCreateModal={handleOpenCreateMissionModal}
      />

      <StarCamMissionFilters
        search={filters.search}
        status={filters.status}
        categoryId={filters.categoryId}
        categories={categories}
        onSearchChange={(value) => updateFilters({ search: value, page: 1 })}
        onStatusChange={(value) => updateFilters({ status: value, page: 1 })}
        onCategoryChange={(value) => updateFilters({ categoryId: value, page: 1 })}
      />

      {error ? (
        <Paper sx={{ p: 2, mb: 2, borderRadius: '12px', backgroundColor: 'error.light' }}>
          <Typography sx={{ fontWeight: 700 }}>{String(error)}</Typography>
        </Paper>
      ) : null}

      {!isDetailsMode ? (
        <Box>
          <StarCamMissionTable
            missions={missions}
            loading={loading.missions}
            selectedMissionId={currentMission?._id || null}
            onToggleMission={handleToggleMission}
            onEditMission={handleOpenEditMissionModal}
            onPublishMission={publishMission}
            onUnpublishMission={unpublishMission}
            onArchiveMission={archiveMission}
          />
          <StarCamMissionTablePaginations
            pagination={pagination}
            onPageChange={(page) => updateFilters({ page })}
            onLimitChange={(limit) => updateFilters({ limit, page: 1 })}
          />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <StarCamMissionTable
              missions={missions}
              loading={loading.missions}
              selectedMissionId={currentMission?._id || null}
              onToggleMission={handleToggleMission}
              onEditMission={handleOpenEditMissionModal}
              onPublishMission={publishMission}
              onUnpublishMission={unpublishMission}
              onArchiveMission={archiveMission}
            />
            <StarCamMissionTablePaginations
              pagination={pagination}
              onPageChange={(page) => updateFilters({ page })}
              onLimitChange={(limit) => updateFilters({ limit, page: 1 })}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <StarCamRightPanelPreviewEdit
              mission={currentMission}
              loading={loading.missionDetails}
              mutating={loading.mutating}
              newVocab={newVocab}
              onVocabChange={(field, value) => setNewVocab((prev) => ({ ...prev, [field]: value }))}
              onSubmitVocabulary={handleSubmitVocabulary}
              onEditVocabulary={handleEditVocabulary}
              onDeleteVocabulary={handleDeleteVocabularyConfirm}
            />
          </Grid>
        </Grid>
      )}

      <StarCamMissionCreateModal
        open={openCreateModal}
        onClose={handleCloseMissionModal}
        categories={categories}
        onCreateMission={handleCreateMission}
        onEditMission={handleEditMission}
        editingMission={editingMission}
        creating={loading.mutating}
      />
    </Box>
  );
};

export default AdminStarCamMissions;

