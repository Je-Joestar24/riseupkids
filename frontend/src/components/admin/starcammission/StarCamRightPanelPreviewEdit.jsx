import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarCamCreateVocabularyModa from './StarCamCreateVocabularyModa';

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
    imageFile: null,
    audioFile: null,
    introAudioFile: null,
    tryAgainAudioFile: null,
    successAudioFile: null,
    pronunciationVideoFile: null,
  });
  const vocabList = Array.isArray(mission?.vocab) ? mission.vocab.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];

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
            <Chip size="small" label={`Status: ${mission.status || '-'}`} />
            <Chip size="small" label={`Vocab: ${vocabList.length}/7`} />
            <Chip size="small" color={mission.missionShortVideo ? 'success' : 'default'} label={mission.missionShortVideo ? 'Short Video Ready' : 'Short Video Missing'} />
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
              <Grid container spacing={1}>
                {vocabList.map((vocab, idx) => (
                  <Grid item xs={12} md={6} key={`${mission._id}-v-${idx}`}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        borderRadius: '10px',
                        height: '100%',
                        backgroundColor: theme.palette.background.default,
                      }}
                    >
                      <Stack spacing={0.8}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {vocab.sortOrder != null ? Number(vocab.sortOrder) + 1 : idx + 1}. {vocab.displayText || vocab.word || '-'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={mission.status === 'archived' ? 'Archived missions are read-only' : 'Edit vocabulary'}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingVocab(vocab);
                                    setEditVocabForm({
                                      displayText: String(vocab?.displayText || vocab?.word || ''),
                                      target: String(vocab?.target || ''),
                                      imageFile: null,
                                      audioFile: null,
                                      introAudioFile: null,
                                      tryAgainAudioFile: null,
                                      successAudioFile: null,
                                      pronunciationVideoFile: null,
                                    });
                                    setOpenEditVocabModal(true);
                                  }}
                                  disabled={mutating || mission.status === 'archived'}
                                  aria-label={`edit vocabulary ${vocab.displayText || vocab.word || idx + 1}`}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={mission.status === 'archived' ? 'Archived missions are read-only' : 'Delete vocabulary'}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => onDeleteVocabulary?.(vocab)}
                                  disabled={mutating || mission.status === 'archived'}
                                  aria-label={`delete vocabulary ${vocab.displayText || vocab.word || idx + 1}`}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Target: {vocab.target || '-'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                          <Tooltip title="Image ready">
                            <Chip
                              size="small"
                              icon={<ImageRoundedIcon />}
                              color={vocab.image ? 'success' : 'default'}
                              label={vocab.image ? 'Image' : 'No Image'}
                            />
                          </Tooltip>
                          <Tooltip title="Main audio ready">
                            <Chip
                              size="small"
                              icon={<GraphicEqRoundedIcon />}
                              color={vocab.audio ? 'success' : 'default'}
                              label={vocab.audio ? 'Audio' : 'No Audio'}
                            />
                          </Tooltip>
                          <Chip
                            size="small"
                            color={vocab.tryAgainAudio ? 'success' : 'default'}
                            label={vocab.tryAgainAudio ? 'Try Again' : 'No Try Again'}
                          />
                          <Chip
                            size="small"
                            color={vocab.successAudio ? 'success' : 'default'}
                            label={vocab.successAudio ? 'Success' : 'No Success'}
                          />
                          <Tooltip title="Short clip for child practice screen (optional)">
                            <Chip
                              size="small"
                              icon={<VideocamRoundedIcon />}
                              color={vocab.pronunciationVideo ? 'success' : 'default'}
                              label={vocab.pronunciationVideo ? 'Practice Video' : 'No Practice Video'}
                            />
                          </Tooltip>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Stack>
      <StarCamCreateVocabularyModa
        open={openAddVocabModal}
        onClose={() => setOpenAddVocabModal(false)}
        missionTitle={mission?.title || ''}
        newVocab={newVocab}
        onVocabChange={onVocabChange}
        onSubmitVocabulary={async () => {
          const canSubmit = Boolean(
            String(newVocab?.displayText || '').trim() &&
              String(newVocab?.target || '').trim() &&
              newVocab?.imageFile &&
              newVocab?.audioFile &&
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
        mode="edit"
        editingSortOrder={editingVocab?.sortOrder}
        existingVocabMedia={{
          imageUrl: editingVocab?.image?.url || '',
          audioUrl: editingVocab?.audio?.url || '',
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
