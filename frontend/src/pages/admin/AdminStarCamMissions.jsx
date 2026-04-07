import React, { useEffect } from 'react';
import { Box, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material';
import StarCamMissionHeader from '../../components/admin/starcammission/StarCamMissionHeader';
import StarCamMissionFilters from '../../components/admin/starcammission/StarCamMissionFilters';
import StarCamMissionCreatePanel from '../../components/admin/starcammission/StarCamMissionCreatePanel';
import StarCamMissionTable from '../../components/admin/starcammission/StarCamMissionTable';
import StarCamMissionTablePaginations from '../../components/admin/starcammission/StarCamMissionTablePaginations';
import useStarCamMissionAdmin from '../../hooks/starCamMissionAdminHook';

const AdminStarCamMissions = () => {
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
    addMission,
    uploadMissionImage,
    loadMissionById,
    addMissionVocabulary,
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
  });

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
    if (!displayText || !target || !newVocab.imageFile || !newVocab.audioFile) return;

    await addMissionVocabulary(currentMission._id, {
      displayText,
      target,
      imageFile: newVocab.imageFile,
      audioFile: newVocab.audioFile,
    });
    await loadMissionById(currentMission._id);
    setNewVocab({ displayText: '', target: '', imageFile: null, audioFile: null });
  };

  const handleCreateMission = async ({ title, categoryId, missionImageFile }) => {
    const created = await addMission({ title, categoryId });
    const createdMissionId = created?.data?._id;
    if (createdMissionId && missionImageFile) {
      await uploadMissionImage(createdMissionId, missionImageFile);
    }
    await loadMissions({
      page: filters.page,
      limit: filters.limit,
      status: filters.status || undefined,
      search: filters.search || undefined,
      categoryId: filters.categoryId || undefined,
    });
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      <StarCamMissionHeader />

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

      <Grid container spacing={2}>
        <Grid item xs={12} md={4} lg={3}>
          <StarCamMissionCreatePanel
            categories={categories}
            onCreateMission={handleCreateMission}
            creating={loading.mutating}
          />
        </Grid>
        <Grid item xs={12} md={8} lg={9}>
          <StarCamMissionTable
            missions={missions}
            loading={loading.missions}
            selectedMissionId={currentMission?._id || null}
            onToggleMission={handleToggleMission}
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
      </Grid>

      {currentMission?._id ? (
        <Paper sx={{ mt: 2, p: 2, borderRadius: '12px' }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Selected Mission</Typography>
          <Typography variant="body2" color="text.secondary">
            {currentMission.title} ({currentMission.missionId}) - {currentMission.status}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Vocabulary: {(currentMission.vocab || []).length}/7
          </Typography>

          {currentMission.status !== 'archived' ? (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
              <TextField
                size="small"
                label="Display Text"
                placeholder="Leaf"
                value={newVocab.displayText}
                onChange={(e) => setNewVocab((prev) => ({ ...prev, displayText: e.target.value }))}
              />
              <TextField
                size="small"
                label="Detect Target"
                placeholder="leaf"
                value={newVocab.target}
                onChange={(e) => setNewVocab((prev) => ({ ...prev, target: e.target.value }))}
              />
              <Button component="label" variant="outlined">
                {newVocab.imageFile ? 'Image Selected' : 'Upload Image'}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setNewVocab((prev) => ({ ...prev, imageFile: e.target.files?.[0] || null }))
                  }
                />
              </Button>
              <Button component="label" variant="outlined">
                {newVocab.audioFile ? 'Audio Selected' : 'Upload Audio'}
                <input
                  hidden
                  type="file"
                  accept="audio/*"
                  onChange={(e) =>
                    setNewVocab((prev) => ({ ...prev, audioFile: e.target.files?.[0] || null }))
                  }
                />
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitVocabulary}
                disabled={loading.mutating || (currentMission.vocab || []).length >= 7}
              >
                Add Vocabulary
              </Button>
            </Stack>
          ) : null}
        </Paper>
      ) : null}
    </Box>
  );
};

export default AdminStarCamMissions;

