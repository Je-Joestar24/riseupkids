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

const StarCamCreateVocabularyModa = ({
  open,
  onClose,
  missionTitle = '',
  newVocab,
  onVocabChange,
  onSubmitVocabulary,
  mutating = false,
}) => {
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const tryAgainAudioInputRef = useRef(null);
  const successAudioInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState('');
  const [audioPreview, setAudioPreview] = useState('');
  const [tryAgainAudioPreview, setTryAgainAudioPreview] = useState('');
  const [successAudioPreview, setSuccessAudioPreview] = useState('');

  const isValid = useMemo(() => {
    return Boolean(
      String(newVocab?.displayText || '').trim() &&
        String(newVocab?.target || '').trim() &&
        newVocab?.imageFile &&
        newVocab?.audioFile &&
        newVocab?.tryAgainAudioFile &&
        newVocab?.successAudioFile
    );
  }, [newVocab]);

  useEffect(() => {
    if (!newVocab?.imageFile) {
      setImagePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(newVocab.imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.imageFile]);

  useEffect(() => {
    if (!newVocab?.audioFile) {
      setAudioPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(newVocab.audioFile);
    setAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.audioFile]);

  useEffect(() => {
    if (!newVocab?.tryAgainAudioFile) {
      setTryAgainAudioPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(newVocab.tryAgainAudioFile);
    setTryAgainAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.tryAgainAudioFile]);

  useEffect(() => {
    if (!newVocab?.successAudioFile) {
      setSuccessAudioPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(newVocab.successAudioFile);
    setSuccessAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newVocab?.successAudioFile]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 700 }}>Add Vocabulary</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            {missionTitle ? `Mission: ${missionTitle}` : 'Fill in details and upload all required media files.'}
          </Typography>
          <Paper variant="outlined" sx={{ p: 1, borderRadius: '10px', backgroundColor: 'background.default' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Audio guide:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Main audio (question): "Can you find a book?"
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Try again audio: "Ow that's not a book, let's try again."
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Success audio: "That's a book, yeyy."
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
                    <TextField
                      size="small"
                      label="Detect Target"
                      placeholder="leaf"
                      value={newVocab?.target || ''}
                      onChange={(e) => onVocabChange('target', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={5}>
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

            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', height: '100%' }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 700 }}>Audio Set</Typography>
                  <input ref={audioInputRef} hidden type="file" accept="audio/*" onChange={(e) => onVocabChange('audioFile', e.target.files?.[0] || null)} />
                  <input ref={tryAgainAudioInputRef} hidden type="file" accept="audio/*" onChange={(e) => onVocabChange('tryAgainAudioFile', e.target.files?.[0] || null)} />
                  <input ref={successAudioInputRef} hidden type="file" accept="audio/*" onChange={(e) => onVocabChange('successAudioFile', e.target.files?.[0] || null)} />

                  {[
                    {
                      label: 'Main Audio (Question)',
                      hint: 'Sample: "Can you find a book?"',
                      preview: audioPreview,
                      ref: audioInputRef,
                      empty: 'Click to upload main question audio',
                      ariaLabel: 'Upload or change main question audio',
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
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutating}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmitVocabulary} disabled={!isValid || mutating}>
          {mutating ? 'Saving...' : 'Add Vocabulary'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StarCamCreateVocabularyModa;
