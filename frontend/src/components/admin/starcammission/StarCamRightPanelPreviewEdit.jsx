import React, { useEffect, useState } from 'react';
import {
  STARCAM_MAX_OBJECTS,
  STARCAM_MIN_OBJECTS,
  canAddStarCamObject,
  isStarCamObjectCountInRange,
  countIncludedVocab,
} from '../../../constants/starCamMissionObjects';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import StarCamCreateVocabularyModa from './StarCamCreateVocabularyModa';
import StarCamCategoryChip from './StarCamCategoryChip';
import { selectionsFromKeywordBucket } from '../../../utils/starCamVisionLabel.util';

const MEDIA_CHECKS = [
  { key: 'image', label: 'Image', icon: ImageRoundedIcon, ready: (v) => Boolean(v?.image) },
  { key: 'audio', label: 'Main audio', icon: GraphicEqRoundedIcon, ready: (v) => Boolean(v?.audio) },
  { key: 'introAudio', label: 'Question audio', icon: GraphicEqRoundedIcon, ready: (v) => Boolean(v?.introAudio) },
  { key: 'tryAgainAudio', label: 'Retry audio', icon: GraphicEqRoundedIcon, ready: (v) => Boolean(v?.tryAgainAudio) },
  { key: 'successAudio', label: 'Success audio', icon: GraphicEqRoundedIcon, ready: (v) => Boolean(v?.successAudio) },
  { key: 'pronunciationVideo', label: 'Practice video', icon: VideocamRoundedIcon, ready: (v) => Boolean(v?.pronunciationVideo), optional: true },
];

function VocabMediaStatus({ vocab, theme }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexWrap: 'wrap' }}>
      {MEDIA_CHECKS.map(({ key, label, icon: Icon, ready, optional }) => {
        const isReady = ready(vocab);
        return (
          <Tooltip key={key} title={`${label}${optional ? ' (optional)' : ''}: ${isReady ? 'ready' : 'missing'}`}>
            <Box
              aria-label={`${label} ${isReady ? 'ready' : 'missing'}`}
              sx={{
                width: 22,
                height: 22,
                borderRadius: '6px',
                display: 'grid',
                placeItems: 'center',
                color: isReady
                  ? theme.palette.success.main
                  : alpha(theme.palette.text.secondary, optional ? 0.45 : 0.75),
                backgroundColor: isReady
                  ? alpha(theme.palette.success.main, 0.12)
                  : alpha(theme.palette.text.secondary, 0.08),
                border: `1px solid ${
                  isReady
                    ? alpha(theme.palette.success.main, 0.35)
                    : alpha(theme.palette.text.secondary, 0.14)
                }`,
              }}
            >
              <Icon sx={{ fontSize: 13 }} />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

const StarCamRightPanelPreviewEdit = ({
  mission,
  loading = false,
  mutating = false,
  inclusionTogglingSortOrder = null,
  newVocab,
  onVocabChange,
  onSubmitVocabulary,
  onEditVocabulary,
  onDeleteVocabulary,
  onToggleVocabularyInclusion,
}) => {
  const theme = useTheme();
  const [openAddVocabModal, setOpenAddVocabModal] = useState(false);
  const [openEditVocabModal, setOpenEditVocabModal] = useState(false);
  const [editingVocab, setEditingVocab] = useState(null);
  const [pendingInclusion, setPendingInclusion] = useState(null);
  const [editVocabForm, setEditVocabForm] = useState({
    displayText: '',
    target: '',
    labelId: null,
    labelSource: null,
    targetLabels: [],
    keywordBucket: null,
    imageFile: null,
    audioFile: null,
    introAudioFile: null,
    tryAgainAudioFile: null,
    successAudioFile: null,
    pronunciationVideoFile: null,
  });

  useEffect(() => {
    if (inclusionTogglingSortOrder == null) {
      setPendingInclusion(null);
    }
  }, [inclusionTogglingSortOrder, mission?.includedCount, mission?.mediaCompleteness?.includedCount]);

  const vocabList = Array.isArray(mission?.vocab)
    ? mission.vocab.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : [];
  const includedCount = Number(mission?.includedCount ?? mission?.mediaCompleteness?.includedCount ?? countIncludedVocab(vocabList));
  const publishReady = isStarCamObjectCountInRange(includedCount) && Boolean(mission?.mediaCompleteness?.hasScanQuestionSet);

  const resolveIncluded = (vocab, idx) => {
    const sortOrder = vocab.sortOrder != null ? Number(vocab.sortOrder) : idx;
    if (pendingInclusion && Number(pendingInclusion.sortOrder) === sortOrder) {
      return pendingInclusion.isIncluded;
    }
    return vocab.isIncluded !== false;
  };

  const handleInclusionToggle = async (vocab, idx, nextIncluded) => {
    const sortOrder = vocab.sortOrder != null ? Number(vocab.sortOrder) : idx;
    setPendingInclusion({ sortOrder, isIncluded: nextIncluded });
    try {
      await onToggleVocabularyInclusion?.(sortOrder, nextIncluded);
    } catch {
      setPendingInclusion(null);
    }
  };

  const openEditModal = (vocab) => {
    setEditingVocab(vocab);
    setEditVocabForm({
      displayText: String(vocab?.displayText || vocab?.word || ''),
      target: String(vocab?.target || ''),
      labelId: vocab?.labelId || null,
      labelSource: vocab?.labelSource || null,
      targetLabels: selectionsFromKeywordBucket(vocab),
      keywordBucket: vocab?.keywordBucket || null,
      imageFile: null,
      audioFile: null,
      introAudioFile: null,
      tryAgainAudioFile: null,
      successAudioFile: null,
      pronunciationVideoFile: null,
    });
    setOpenEditVocabModal(true);
  };

  if (!mission) {
    return (
      <Paper
        sx={{
          p: 2,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.border.main}`,
          minHeight: 360,
          height: '100%',
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>Mission Preview & Edit</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Select a mission from the table to view details and manage vocabulary.
        </Typography>
      </Paper>
    );
  }

  const isArchived = mission.status === 'archived';

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }} noWrap>
              {mission.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {mission.missionId}
            </Typography>
          </Box>
          {mission.status !== 'archived' ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setOpenAddVocabModal(true)}
              disabled={mutating || !canAddStarCamObject(vocabList.length)}
              sx={{ flexShrink: 0 }}
            >
              Add
            </Button>
          ) : null}
        </Box>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
          {mission.category ? <StarCamCategoryChip category={mission.category} /> : null}
          <Chip size="small" variant="outlined" label={mission.status || '-'} />
          <Chip
            size="small"
            color={isStarCamObjectCountInRange(includedCount) ? 'success' : 'warning'}
            label={`Hunt: ${includedCount} (${STARCAM_MIN_OBJECTS}-${STARCAM_MAX_OBJECTS})`}
          />
          <Chip size="small" variant="outlined" label={`Saved ${vocabList.length}/${STARCAM_MAX_OBJECTS}`} />
          <Chip
            size="small"
            color={publishReady ? 'success' : 'default'}
            label={publishReady ? 'Ready to publish' : 'Incomplete'}
          />
        </Stack>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>Objects / Vocabulary</Typography>
        <Typography variant="caption" color="text.secondary">
          Toggle included objects for the child hunt. Edit and delete stay available while toggling.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : vocabList.length === 0 ? (
        <Typography color="text.secondary">No vocabulary yet.</Typography>
      ) : (
        <Stack
          spacing={0.75}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            pr: 0.25,
          }}
        >
          {vocabList.map((vocab, idx) => {
            const rowNumber = vocab.sortOrder != null ? Number(vocab.sortOrder) + 1 : idx + 1;
            const displayName = vocab.displayText || vocab.word || '-';
            const sortOrder = vocab.sortOrder != null ? Number(vocab.sortOrder) : idx;
            const isIncluded = resolveIncluded(vocab, idx);
            const isToggling =
              inclusionTogglingSortOrder != null &&
              Number(inclusionTogglingSortOrder) === sortOrder;

            return (
              <Box
                key={`${mission._id}-v-${sortOrder}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.85,
                  borderRadius: '12px',
                  border: `1px solid ${
                    isIncluded
                      ? alpha(theme.palette.success.main, 0.28)
                      : alpha(theme.palette.divider, 0.9)
                  }`,
                  backgroundColor: isIncluded
                    ? alpha(theme.palette.success.main, 0.06)
                    : alpha(theme.palette.text.secondary, 0.04),
                  transition: 'border-color 160ms ease, background-color 160ms ease, opacity 160ms ease',
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '8px',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: theme.palette.common.white,
                    background: isIncluded
                      ? `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark || theme.palette.success.main})`
                      : alpha(theme.palette.text.secondary, 0.55),
                  }}
                >
                  {rowNumber}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      lineHeight: 1.15,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {vocab.target || '-'}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <VocabMediaStatus vocab={vocab} theme={theme} />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                  <Tooltip title={isIncluded ? 'Included in hunt — click to exclude' : 'Excluded — click to include'}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, position: 'relative' }}>
                      <Switch
                        size="small"
                        checked={isIncluded}
                        disabled={isArchived || isToggling}
                        onChange={(event) => {
                          void handleInclusionToggle(vocab, idx, event.target.checked);
                        }}
                        inputProps={{ 'aria-label': `Include ${displayName} in mission` }}
                      />
                      {isToggling ? (
                        <CircularProgress size={14} thickness={5} aria-label={`Updating ${displayName}`} />
                      ) : isIncluded ? (
                        <CheckCircleRoundedIcon sx={{ fontSize: 17, color: theme.palette.success.main }} aria-hidden />
                      ) : (
                        <RadioButtonUncheckedRoundedIcon
                          sx={{ fontSize: 17, color: theme.palette.text.disabled }}
                          aria-hidden
                        />
                      )}
                    </Box>
                  </Tooltip>

                  <Tooltip title={isArchived ? 'Archived missions are read-only' : 'Edit vocabulary'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => openEditModal(vocab)}
                        disabled={mutating || isArchived}
                        aria-label={`Edit vocabulary ${displayName}`}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title={isArchived ? 'Archived missions are read-only' : 'Delete vocabulary'}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteVocabulary?.(vocab)}
                        disabled={mutating || isArchived}
                        aria-label={`Delete vocabulary ${displayName}`}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      <StarCamCreateVocabularyModa
        open={openAddVocabModal}
        onClose={() => setOpenAddVocabModal(false)}
        missionTitle={mission?.title || ''}
        missionCategory={mission?.category}
        newVocab={newVocab}
        onVocabChange={onVocabChange}
        onSubmitVocabulary={async () => {
          const canSubmit = Boolean(
            String(newVocab?.displayText || '').trim() &&
              String(newVocab?.target || '').trim() &&
              newVocab?.imageFile &&
              newVocab?.audioFile &&
              newVocab?.introAudioFile &&
              newVocab?.tryAgainAudioFile &&
              newVocab?.successAudioFile
          );
          if (!canSubmit) return;
          await onSubmitVocabulary();
          setOpenAddVocabModal(false);
        }}
        mutating={mutating}
      />
      <StarCamCreateVocabularyModa
        open={openEditVocabModal}
        onClose={() => {
          if (mutating) return;
          setOpenEditVocabModal(false);
          setEditingVocab(null);
        }}
        missionTitle={mission?.title || ''}
        missionCategory={mission?.category}
        mode="edit"
        editingSortOrder={editingVocab?.sortOrder}
        existingVocabMedia={{
          imageUrl: editingVocab?.image?.url || '',
          audioUrl: editingVocab?.audio?.url || '',
          introAudioUrl: editingVocab?.introAudio?.url || '',
          tryAgainAudioUrl: editingVocab?.tryAgainAudio?.url || '',
          successAudioUrl: editingVocab?.successAudio?.url || '',
          pronunciationVideoUrl: editingVocab?.pronunciationVideo?.url || '',
        }}
        newVocab={editVocabForm}
        onVocabChange={(field, value) => setEditVocabForm((prev) => ({ ...prev, [field]: value }))}
        onSubmitVocabulary={async () => {
          if (!mission?._id || editingVocab?.sortOrder == null) return;
          await onEditVocabulary?.(mission._id, editingVocab.sortOrder, editVocabForm);
          setOpenEditVocabModal(false);
          setEditingVocab(null);
        }}
        mutating={mutating}
      />
    </Paper>
  );
};

export default StarCamRightPanelPreviewEdit;
