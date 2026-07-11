import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StarCamCategoryChip from './StarCamCategoryChip';
import StarCamLabelAutocomplete from './StarCamLabelAutocomplete';

const StarCamCreateVocabularyModa = ({
  open,
  onClose,
  missionTitle = '',
  missionCategory = null,
  newVocab,
  onVocabChange,
  onSubmitVocabulary,
  mutating = false,
  mode = 'create',
  editingSortOrder = null,
  existingVocabMedia = null,
}) => {
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const introAudioInputRef = useRef(null);
  const tryAgainAudioInputRef = useRef(null);
  const successAudioInputRef = useRef(null);
  const pronunciationVideoInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState('');
  const [audioPreview, setAudioPreview] = useState('');
  const [introAudioPreview, setIntroAudioPreview] = useState('');
  const [tryAgainAudioPreview, setTryAgainAudioPreview] = useState('');
  const [successAudioPreview, setSuccessAudioPreview] = useState('');
  const [pronunciationVideoPreview, setPronunciationVideoPreview] = useState('');
  const handleLabelPayload = (payload) => {
    if (!payload) {
      onVocabChange('target', '');
      onVocabChange('labelId', null);
      onVocabChange('labelSource', null);
      onVocabChange('targetLabels', []);
      onVocabChange('keywordBucket', null);
      return;
    }
    onVocabChange('target', payload.target || '');
    onVocabChange('labelId', payload.labelId || null);
    onVocabChange('labelSource', payload.labelSource || null);
    onVocabChange('targetLabels', payload.targetLabels || []);
    onVocabChange('keywordBucket', payload.keywordBucket || null);
    if (!String(newVocab?.displayText || '').trim() && payload.targetLabels?.[0]?.displayName) {
      onVocabChange('displayText', payload.targetLabels[0].displayName);
    }
  };

  const handleAudioFieldChange = (fieldKey, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    onVocabChange(fieldKey, file || null);
  };

  const isValid = useMemo(() => {
    const hasRequiredFilesFromExisting = Boolean(
      existingVocabMedia?.imageUrl &&
        existingVocabMedia?.audioUrl &&
        existingVocabMedia?.introAudioUrl &&
        existingVocabMedia?.tryAgainAudioUrl &&
        existingVocabMedia?.successAudioUrl
    );
    const isCreateMode = mode !== 'edit';
    return Boolean(
      String(newVocab?.displayText || '').trim() &&
        String(newVocab?.target || '').trim() &&
        (Array.isArray(newVocab?.targetLabels) ? newVocab.targetLabels.length > 0 : true) &&
        (newVocab?.imageFile || !isCreateMode || hasRequiredFilesFromExisting) &&
        (newVocab?.audioFile || !isCreateMode || hasRequiredFilesFromExisting) &&
        (newVocab?.introAudioFile || !isCreateMode || hasRequiredFilesFromExisting) &&
        (newVocab?.tryAgainAudioFile || !isCreateMode || hasRequiredFilesFromExisting) &&
        (newVocab?.successAudioFile || !isCreateMode || hasRequiredFilesFromExisting)
    );
  }, [newVocab, mode, existingVocabMedia]);

  useEffect(() => {
    const file = newVocab?.imageFile;
    if (!file) {
      setImagePreview(existingVocabMedia?.imageUrl || '');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.imageFile, existingVocabMedia?.imageUrl]);

  useEffect(() => {
    const file = newVocab?.audioFile;
    if (!file) {
      setAudioPreview(existingVocabMedia?.audioUrl || '');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.audioFile, existingVocabMedia?.audioUrl]);

  useEffect(() => {
    const file = newVocab?.introAudioFile;
    if (!file) {
      setIntroAudioPreview(existingVocabMedia?.introAudioUrl || '');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setIntroAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.introAudioFile, existingVocabMedia?.introAudioUrl]);

  useEffect(() => {
    const file = newVocab?.tryAgainAudioFile;
    if (!file) {
      setTryAgainAudioPreview(existingVocabMedia?.tryAgainAudioUrl || '');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setTryAgainAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.tryAgainAudioFile, existingVocabMedia?.tryAgainAudioUrl]);

  useEffect(() => {
    const file = newVocab?.successAudioFile;
    if (!file) {
      setSuccessAudioPreview(existingVocabMedia?.successAudioUrl || '');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setSuccessAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.successAudioFile, existingVocabMedia?.successAudioUrl]);

  useEffect(() => {
    const file = newVocab?.pronunciationVideoFile;
    if (!file) {
      setPronunciationVideoPreview(existingVocabMedia?.pronunciationVideoUrl || '');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPronunciationVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.pronunciationVideoFile, existingVocabMedia?.pronunciationVideoUrl]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 700 }}>{mode === 'edit' ? 'Edit Vocabulary' : 'Add Vocabulary'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              {missionTitle ? `Mission: ${missionTitle}` : 'Fill in details and upload all required media files.'}
            </Typography>
            {missionCategory ? <StarCamCategoryChip category={missionCategory} /> : null}
          </Box>
          {mode === 'edit' ? (
            <Typography variant="caption" color="text.secondary">
              Editing vocabulary #{Number(editingSortOrder ?? 0) + 1}. Upload a new file only for the media you want to replace.
            </Typography>
          ) : null}
          <Paper variant="outlined" sx={{ p: 1, borderRadius: '10px', backgroundColor: 'background.default' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Audio guide:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Main audio: "Can you find a book?"
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Scan question audio: "Is this a book?"
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Try again audio: "Ow that's not a book, let's try again."
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Success audio: "That's a book, yeyy."
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Practice sample video (optional): short clip shown on the child practice screen with pronunciation or demo.
            </Typography>
          </Paper>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px' }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      size="small"
                      label="Display Text"
                      placeholder="Leaf"
                      value={newVocab?.displayText || ''}
                      onChange={(e) => onVocabChange('displayText', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <StarCamLabelAutocomplete
                      label="Detect Targets"
                      required
                      disabled={mutating}
                      selectedLabels={newVocab?.targetLabels || []}
                      onChange={handleLabelPayload}
                      onDisplayNameSuggest={(displayName) => {
                        if (!String(newVocab?.displayText || '').trim()) {
                          onVocabChange('displayText', displayName);
                        }
                      }}
                      helperText="Select multiple words Vision may return (first chip = primary target)."
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7.5}>
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', height: '100%' }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 700 }}>Reference Image</Typography>
                  <input
                    ref={imageInputRef}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => onVocabChange('imageFile', e.target.files?.[0] || null)}
                  />
                  {imagePreview ? (
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label="Change vocabulary image"
                      onClick={() => imageInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click();
                      }}
                      sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                    >
                      <Box
                        component="img"
                        src={imagePreview}
                        alt="Vocabulary preview"
                        sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          imageInputRef.current?.click();
                        }}
                        sx={{ position: 'absolute', top: 8, right: 8, minWidth: 'unset', px: 1, py: 0.25 }}
                      >
                        Change
                      </Button>
                    </Box>
                  ) : (
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label="Upload vocabulary image"
                      onClick={() => imageInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click();
                      }}
                      sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: '10px',
                        border: '1px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Click to upload image
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4.5}>
              <Stack spacing={1.25} sx={{ height: '100%' }}>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', flex: '0 0 auto' }}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700 }}>Audio Set</Typography>
                    <input ref={audioInputRef} hidden type="file" accept="audio/*" onChange={(e) => handleAudioFieldChange('audioFile', e)} />
                    <input ref={introAudioInputRef} hidden type="file" accept="audio/*" onChange={(e) => handleAudioFieldChange('introAudioFile', e)} />
                    <input ref={tryAgainAudioInputRef} hidden type="file" accept="audio/*" onChange={(e) => handleAudioFieldChange('tryAgainAudioFile', e)} />
                    <input ref={successAudioInputRef} hidden type="file" accept="audio/*" onChange={(e) => handleAudioFieldChange('successAudioFile', e)} />

                    {[
                      {
                        label: 'Main Audio',
                        hint: 'Sample: "Can you find a book?"',
                        preview: audioPreview,
                        ref: audioInputRef,
                        empty: 'Click to upload main audio',
                        ariaLabel: 'Upload or change main audio',
                      },
                      {
                        label: 'Scan Question Audio',
                        hint: 'Sample: "Is this a book?"',
                        preview: introAudioPreview,
                        ref: introAudioInputRef,
                        empty: 'Click to upload scan question audio',
                        ariaLabel: 'Upload or change scan question audio',
                      },
                      {
                        label: 'Try Again Audio',
                        hint: `Sample: "Ow that's not a book, let's try again."`,
                        preview: tryAgainAudioPreview,
                        ref: tryAgainAudioInputRef,
                        empty: 'Click to upload try again audio',
                        ariaLabel: 'Upload or change try again audio',
                      },
                      {
                        label: 'Success Audio',
                        hint: `Sample: "That's a book, yeyy."`,
                        preview: successAudioPreview,
                        ref: successAudioInputRef,
                        empty: 'Click to upload success audio',
                        ariaLabel: 'Upload or change success audio',
                      },
                    ].map((item) => (
                      <Box key={item.label}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          {item.label}
                        </Typography>
                        {item.hint ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {item.hint}
                          </Typography>
                        ) : null}
                        <Box
                          role="button"
                          tabIndex={0}
                          aria-label={item.ariaLabel}
                          onClick={() => item.ref.current?.click()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') item.ref.current?.click();
                          }}
                          sx={{
                            minHeight: 56,
                            borderRadius: '10px',
                            border: item.preview ? '1px solid' : '1px dashed',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 0,
                            cursor: 'pointer',
                            position: 'relative',
                            backgroundColor: 'background.paper',
                          }}
                        >
                          {item.preview ? (
                            <>
                              <Box component="audio" controls src={item.preview} sx={{ width: '100%', display: 'block' }} aria-label={`Preview ${item.label}`} />
                              <Button
                                size="small"
                                variant="contained"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  item.ref.current?.click();
                                }}
                                sx={{ position: 'absolute', top: 8, right: 8, minWidth: 'unset', px: 1, py: 0.25 }}
                              >
                                Change
                              </Button>
                            </>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {item.empty}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', flex: '1 1 auto' }}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700 }}>Practice sample video</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Shown on the child app practice screen. Leave empty if you only use image + audio.
                    </Typography>
                    <input
                      ref={pronunciationVideoInputRef}
                      hidden
                      type="file"
                      accept="video/*"
                      onChange={(e) => onVocabChange('pronunciationVideoFile', e.target.files?.[0] || null)}
                    />
                    {pronunciationVideoPreview ? (
                      <Box
                        role="button"
                        tabIndex={0}
                        aria-label="Change practice sample video"
                        onClick={() => pronunciationVideoInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') pronunciationVideoInputRef.current?.click();
                        }}
                        sx={{
                          width: '100%',
                          aspectRatio: '16 / 9',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: 'grey.900',
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                      >
                        <Box
                          component="video"
                          controls
                          src={pronunciationVideoPreview}
                          playsInline
                          aria-label="Practice video preview"
                          sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            pronunciationVideoInputRef.current?.click();
                          }}
                          sx={{ position: 'absolute', top: 8, right: 8, minWidth: 'unset', px: 1, py: 0.25 }}
                        >
                          Change
                        </Button>
                      </Box>
                    ) : (
                      <Box
                        role="button"
                        tabIndex={0}
                        aria-label="Upload optional practice sample video"
                        onClick={() => pronunciationVideoInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') pronunciationVideoInputRef.current?.click();
                        }}
                        sx={{
                          width: '100%',
                          minHeight: 120,
                          aspectRatio: '16 / 9',
                          borderRadius: '10px',
                          border: '1px dashed',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Click to upload practice video (optional)
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutating}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmitVocabulary} disabled={!isValid || mutating}>
          {mutating ? 'Saving...' : mode === 'edit' ? 'Save Vocabulary' : 'Add Vocabulary'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StarCamCreateVocabularyModa;
