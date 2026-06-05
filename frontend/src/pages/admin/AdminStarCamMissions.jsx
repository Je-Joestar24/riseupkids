import React, { useEffect, useMemo } from 'react';
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
import { sortStarCamCategoriesForAdminDisplay } from '../../utils/starCamCategoryDisplay';

const normalizeTarget = (value) => String(value || '').trim().toLowerCase();

const normalizeTargetKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

const targetsMatch = (left, right) => {
  const leftRaw = normalizeTarget(left);
  const rightRaw = normalizeTarget(right);
  if (leftRaw && rightRaw && leftRaw === rightRaw) return true;
  const leftKey = normalizeTargetKey(leftRaw);
  const rightKey = normalizeTargetKey(rightRaw);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
};

const toRefId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return null;
};

const toMissionItemPatch = (item) => ({
  target: normalizeTarget(item?.target),
  prompt: item?.prompt ?? item?.questionText ?? null,
  questionText: item?.questionText ?? item?.prompt ?? null,
  questionAudio: toRefId(item?.questionAudio),
  fail: item?.fail ?? item?.tryAgainText ?? null,
  tryAgainText: item?.tryAgainText ?? item?.fail ?? null,
  tryAgainAudio: toRefId(item?.tryAgainAudio),
  success: item?.success ?? item?.successText ?? null,
  successText: item?.successText ?? item?.success ?? null,
  successAudio: toRefId(item?.successAudio),
  sortOrder: Number(item?.sortOrder ?? 0),
});

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
    editMissionScanItem,
    removeMissionItem,
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
    introAudioFile: null,
    tryAgainAudioFile: null,
    successAudioFile: null,
    pronunciationVideoFile: null,
  });
  const [openCreateModal, setOpenCreateModal] = React.useState(false);
  const [editingMission, setEditingMission] = React.useState(null);
  const displayCategories = useMemo(
    () => sortStarCamCategoriesForAdminDisplay(categories),
    [categories]
  );

  useEffect(() => {
    void loadCategories().catch(() => {
      /* runThunk already surfaces errors; avoid unhandled rejection */
    });
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
    if (!displayText || !target || !newVocab.imageFile || !newVocab.audioFile || !newVocab.introAudioFile || !newVocab.tryAgainAudioFile || !newVocab.successAudioFile) {
      return;
    }

    await addMissionVocabulary(currentMission._id, {
      displayText,
      target,
      imageFile: newVocab.imageFile,
      audioFile: newVocab.audioFile,
      introAudioFile: newVocab.introAudioFile,
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
      introAudioFile: null,
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

  const handleEditMissionItem = async (missionId, sortOrder, payload) => {
    if (!missionId || sortOrder == null) return;
    await editMissionScanItem(missionId, sortOrder, payload);
    await loadMissionById(missionId);
  };

  const handleDeleteMissionItemConfirm = (item) => {
    if (!currentMission?._id || item?.sortOrder == null) return;
    dispatch(
      showConfirmationDialog({
        title: 'Delete Scan Item?',
        message: `This will permanently remove "${item?.target || 'this scan item'}" from the mission.`,
        type: 'warning',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          await removeMissionItem(currentMission._id, item.sortOrder);
          await loadMissionById(currentMission._id);
        },
      })
    );
  };

  const handleSyncScanItems = async (items) => {
    if (!currentMission?._id || !Array.isArray(items) || items.length === 0) return;
    await editMission(currentMission._id, { items }, { notifySuccess: false });
    await loadMissionById(currentMission._id);
    dispatch(showNotification({ message: 'Scan questions updated from vocabulary', type: 'success' }));
  };

  const alignScanItemTargetsWithVocabulary = async (mission) => {
    if (!mission?._id) return mission;
    const vocabList = Array.isArray(mission.vocab) ? mission.vocab : [];
    const itemList = Array.isArray(mission.items) ? mission.items : [];
    if (!vocabList.length || !itemList.length) return mission;

    const vocabBySortOrder = new Map(vocabList.map((entry) => [Number(entry?.sortOrder), entry]));
    const syncedItems = itemList.map((item) => {
      const sortOrder = Number(item?.sortOrder);
      const vocab = vocabBySortOrder.get(sortOrder);
      const vocabTarget = normalizeTarget(vocab?.target);
      if (!vocabTarget) return item;
      if (targetsMatch(item?.target, vocabTarget)) return item;
      return {
        ...item,
        target: vocabTarget,
      };
    });

    const hasChanges = syncedItems.some((item, idx) => normalizeTarget(item?.target) !== normalizeTarget(itemList[idx]?.target));
    if (!hasChanges) return mission;

    await editMission(
      mission._id,
      { items: syncedItems.map((item) => toMissionItemPatch(item)) },
      { notifySuccess: false }
    );
    const refreshed = await loadMissionById(mission._id);
    dispatch(showNotification({ message: 'Auto-synced scan targets to vocabulary before publish', type: 'info' }));
    return refreshed?.data || mission;
  };

  const handlePublishMission = async (missionId) => {
    if (!missionId) return;
    const missionSource =
      currentMission?._id === missionId
        ? currentMission
        : (await loadMissionById(missionId))?.data;
    const syncedMission = await alignScanItemTargetsWithVocabulary(missionSource);
    await publishMission(missionId);
    await loadMissions(missionQueryParams);
    if (currentMission?._id === missionId || syncedMission?._id === missionId) {
      await loadMissionById(missionId);
    }
  };

  const missionQueryParams = {
    page: filters.page,
    limit: filters.limit,
    status: filters.status || undefined,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
  };

  const handleCreateMission = async ({
    title,
    categoryId,
    missionImageFile,
    missionShortVideoFile,
    missionIntroAudioFile,
    rewardAudioFile,
    rewardVideoFile,
  }) => {
    const created = await addMission(
      { title, categoryId },
      { notifySuccess: false }
    );
    const createdMissionId = created?.data?._id;
    if (createdMissionId && missionImageFile) {
      await uploadMissionImage(createdMissionId, missionImageFile, { notifySuccess: false });
    }
    if (createdMissionId && (missionShortVideoFile || missionIntroAudioFile || rewardAudioFile || rewardVideoFile)) {
      await updateMissionMedia(createdMissionId, {
        shortVideoFile: missionShortVideoFile,
        missionIntroAudioFile,
        rewardAudioFile,
        rewardVideoFile,
      }, { notifySuccess: false });
    }
    await loadMissions(missionQueryParams);
    dispatch(showNotification({ message: 'Mission upload completed successfully', type: 'success' }));
  };

  const handleEditMission = async (
    missionId,
    { title, categoryId, missionImageFile, missionShortVideoFile, missionIntroAudioFile, rewardAudioFile, rewardVideoFile }
  ) => {
    await editMission(missionId, { title, categoryId }, { notifySuccess: false });
    if (missionImageFile) {
      await uploadMissionImage(missionId, missionImageFile, { notifySuccess: false });
    }
    if (missionShortVideoFile || missionIntroAudioFile || rewardAudioFile || rewardVideoFile) {
      await updateMissionMedia(missionId, {
        shortVideoFile: missionShortVideoFile,
        missionIntroAudioFile,
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

  const handleOpenCreateMissionModal = async () => {
    setEditingMission(null);
    await loadCategories().catch(() => {
      /* runThunk already surfaces errors */
    });
    setOpenCreateModal(true);
  };

  const handleOpenEditMissionModal = async (mission) => {
    if (!mission?._id) return;
    await loadCategories().catch(() => {
      /* runThunk already surfaces errors */
    });
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
        categories={displayCategories}
        categoriesLoading={loading.categories}
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
            onPublishMission={handlePublishMission}
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
              onPublishMission={handlePublishMission}
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
              onEditMissionItem={handleEditMissionItem}
              onDeleteMissionItem={handleDeleteMissionItemConfirm}
              onSyncScanItems={handleSyncScanItems}
            />
          </Grid>
        </Grid>
      )}

      <StarCamMissionCreateModal
        open={openCreateModal}
        onClose={handleCloseMissionModal}
        categories={displayCategories}
        categoriesLoading={loading.categories}
        onCreateMission={handleCreateMission}
        onEditMission={handleEditMission}
        editingMission={editingMission}
        creating={loading.mutating}
      />
    </Box>
  );
};

export default AdminStarCamMissions;

