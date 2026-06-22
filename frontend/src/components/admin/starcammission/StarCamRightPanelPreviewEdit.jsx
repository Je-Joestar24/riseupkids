import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
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
import StarCamCreateVocabularyModa from './StarCamCreateVocabularyModa';
import StarCamCategoryChip from './StarCamCategoryChip';
import { selectionsFromKeywordBucket } from '../../../utils/starCamVisionLabel.util';

const StarCamRightPanelPreviewEdit = ({
  mission,
  loading = false,
  mutating = false,
  newVocab,
  onVocabChange,
  onSubmitVocabulary,
  onEditVocabulary,
  onDeleteVocabulary,
}) => {
  const theme = useTheme();
  const [openAddVocabModal, setOpenAddVocabModal] = useState(false);
  const [openEditVocabModal, setOpenEditVocabModal] = useState(false);
  const [editingVocab, setEditingVocab] = useState(null);
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
  const vocabList = Array.isArray(mission?.vocab) ? mission.vocab.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];
  const scanItems = Array.isArray(mission?.items) ? mission.items.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];
  const scanCount = Number(mission?.mediaCompleteness?.scanCount ?? scanItems.length ?? 0);
  const getStatusChipSx = (isReady) => ({
    fontWeight: 800,
    borderRadius: '999px',
    color: isReady
      ? theme.palette.success.contrastText || theme.palette.common.white
      : theme.palette.text.secondary,
    backgroundColor: isReady
      ? theme.palette.success.main
      : alpha(theme.palette.text.secondary, 0.08),
    border: `1px solid ${
      isReady
        ? alpha(theme.palette.success.dark || theme.palette.success.main, 0.35)
        : alpha(theme.palette.text.secondary, 0.16)
    }`,
    '& .MuiChip-label': {
      color: 'inherit',
    },
    '& .MuiChip-icon': {
      color: 'inherit',
    },
  });

  if (!mission) {
    return (
      <Paper sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${theme.palette.border.main}`, minHeight: 420 }}>
        <Typography sx={{ fontWeight: 700 }}>Mission Preview & Edit</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Select a mission from the table to view details and manage vocabulary.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${theme.palette.border.main}`, minHeight: 420 }}>
      <Stack spacing={2}>
        <Box>
          <Typography sx={{ fontWeight: 700 }}>Mission Preview & Edit</Typography>
          <Typography variant="body2" color="text.secondary">
            {mission.title} ({mission.missionId})
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
            {mission.category ? <StarCamCategoryChip category={mission.category} /> : null}
            <Chip size="small" label={`Status: ${mission.status || '-'}`} />
            <Chip size="small" label={`Vocab: ${vocabList.length}/7`} />
            <Chip size="small" color={scanCount === 7 ? 'success' : 'default'} label={`Scan: ${scanCount}/7`} />
            <Chip
              size="small"
              color={mission.mediaCompleteness?.hasScanQuestionSet ? 'success' : 'default'}
              label={mission.mediaCompleteness?.hasScanQuestionSet ? 'Scan Audio Ready' : 'Scan Audio Incomplete'}
            />
            <Chip size="small" color={mission.missionShortVideo ? 'success' : 'default'} label={mission.missionShortVideo ? 'Short Video Ready' : 'Short Video Missing'} />
            <Chip size="small" color={mission.missionIntroAudio ? 'success' : 'default'} label={mission.missionIntroAudio ? 'Intro Audio Ready' : 'Intro Audio Missing'} />
            <Chip size="small" color={mission.rewardAudio ? 'success' : 'default'} label={mission.rewardAudio ? 'Reward Audio Ready' : 'Reward Audio Missing'} />
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Vocabulary List</Typography>
              {mission.status !== 'archived' ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setOpenAddVocabModal(true)}
                  disabled={mutating || vocabList.length >= 7}
                >
                  Add Vocabulary
                </Button>
              ) : null}
            </Box>
            {vocabList.length === 0 ? (
              <Typography color="text.secondary">No vocabulary yet.</Typography>
            ) : (
              <Stack
                spacing={0}
                sx={{
                  border: `1px solid ${theme.palette.border.main}`,
                  borderRadius: '14px',
                  backgroundColor: theme.palette.background.paper,
                  overflow: 'hidden',
                }}
              >
                {vocabList.map((vocab, idx) => {
                  const rowNumber = vocab.sortOrder != null ? Number(vocab.sortOrder) + 1 : idx + 1;
                  const displayName = vocab.displayText || vocab.word || '-';
                  const isArchived = mission.status === 'archived';

                  return (
                    <Box
                      key={`${mission._id}-v-${idx}`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'auto 1fr auto', lg: 'auto minmax(140px, 1fr) minmax(300px, 1.4fr) auto' },
                        alignItems: 'center',
                        gap: { xs: 1, lg: 1.25 },
                        px: 1.25,
                        py: 1,
                        borderBottom: idx === vocabList.length - 1 ? 'none' : `1px solid ${theme.palette.border.main}`,
                        backgroundColor: idx % 2 === 0
                          ? theme.palette.background.paper
                          : alpha(theme.palette.orange?.main || theme.palette.primary.main, 0.035),
                        transition: 'background-color 160ms ease, box-shadow 160ms ease',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.orange?.main || theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <Box
                        aria-hidden="true"
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: theme.palette.textCustom?.inverse || theme.palette.common.white,
                          background: `linear-gradient(135deg, ${theme.palette.orange?.main || theme.palette.primary.main} 0%, ${theme.palette.orange?.dark || theme.palette.primary.dark} 100%)`,
                          boxShadow: `0 2px 8px ${alpha(theme.palette.orange?.main || theme.palette.primary.main, 0.28)}`,
                        }}
                      >
                        {rowNumber}
                      </Box>

                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            lineHeight: 1.15,
                            color: theme.palette.text.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: theme.palette.text.secondary,
                            display: 'block',
                            mt: 0.15,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Target: {vocab.target || '-'}
                          {Array.isArray(vocab?.keywordBucket?.terms) && vocab.keywordBucket.terms.length > 1
                            ? ` (+${vocab.keywordBucket.terms.length - 1} match words)`
                            : ''}
                          {vocab.labelSource === 'custom' ? (
                            <Chip
                              component="span"
                              size="small"
                              label="Custom"
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 0.75, height: 20, verticalAlign: 'middle' }}
                              aria-label="Custom vision label"
                            />
                          ) : null}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: { xs: 'none', lg: 'flex' },
                          alignItems: 'center',
                          gap: 0.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Tooltip title={vocab.image ? 'Image ready' : 'Image missing'}>
                          <Chip
                            size="small"
                            icon={<ImageRoundedIcon />}
                            color={vocab.image ? 'success' : 'default'}
                            label="Image"
                            sx={getStatusChipSx(Boolean(vocab.image))}
                          />
                        </Tooltip>
                        <Tooltip title={vocab.audio ? 'Main audio ready' : 'Main audio missing'}>
                          <Chip
                            size="small"
                            icon={<GraphicEqRoundedIcon />}
                            color={vocab.audio ? 'success' : 'default'}
                            label="Main"
                            sx={getStatusChipSx(Boolean(vocab.audio))}
                          />
                        </Tooltip>
                        <Chip
                          size="small"
                          color={vocab.introAudio ? 'success' : 'default'}
                          label="Question"
                          sx={getStatusChipSx(Boolean(vocab.introAudio))}
                        />
                        <Chip
                          size="small"
                          color={vocab.tryAgainAudio ? 'success' : 'default'}
                          label="Retry"
                          sx={getStatusChipSx(Boolean(vocab.tryAgainAudio))}
                        />
                        <Chip
                          size="small"
                          color={vocab.successAudio ? 'success' : 'default'}
                          label="Success"
                          sx={getStatusChipSx(Boolean(vocab.successAudio))}
                        />
                        <Tooltip title={vocab.pronunciationVideo ? 'Practice video ready' : 'Practice video optional'}>
                          <Chip
                            size="small"
                            icon={<VideocamRoundedIcon />}
                            color={vocab.pronunciationVideo ? 'success' : 'default'}
                            label="Video"
                            sx={getStatusChipSx(Boolean(vocab.pronunciationVideo))}
                          />
                        </Tooltip>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.35 }}>
                        <Tooltip title={isArchived ? 'Archived missions are read-only' : 'Edit vocabulary'}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => {
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
                              }}
                              disabled={mutating || isArchived}
                              aria-label={`edit vocabulary ${displayName || idx + 1}`}
                              sx={{
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                  color: theme.palette.orange?.dark || theme.palette.primary.dark,
                                  backgroundColor: alpha(theme.palette.orange?.main || theme.palette.primary.main, 0.12),
                                },
                              }}
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
                              aria-label={`delete vocabulary ${displayName || idx + 1}`}
                              sx={{
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                                },
                              }}
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
          </Box>
        )}
      </Stack>
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
