import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const initialForm = {
  title: '',
  categoryId: '',
  missionImageFile: null,
  missionShortVideoFile: null,
  rewardAudioFile: null,
  rewardVideoFile: null,
};

const StarCamMissionCreateModal = ({ open, onClose, categories = [], onCreateMission, creating = false }) => {
  const theme = useTheme();
  const [form, setForm] = useState(initialForm);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [rewardVideoPreviewUrl, setRewardVideoPreviewUrl] = useState('');
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const rewardVideoInputRef = useRef(null);

  const isValid = useMemo(() => Boolean(form.title.trim() && form.categoryId), [form]);

  useEffect(() => {
    if (!form.missionImageFile) {
      setImagePreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(form.missionImageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.missionImageFile]);

  useEffect(() => {
    if (!form.missionShortVideoFile) {
      setVideoPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(form.missionShortVideoFile);
    setVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.missionShortVideoFile]);

  useEffect(() => {
    if (!form.rewardAudioFile) {
      setAudioPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(form.rewardAudioFile);
    setAudioPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.rewardAudioFile]);

  useEffect(() => {
    if (!form.rewardVideoFile) {
      setRewardVideoPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(form.rewardVideoFile);
    setRewardVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.rewardVideoFile]);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setImagePreviewUrl('');
      setVideoPreviewUrl('');
      setAudioPreviewUrl('');
      setRewardVideoPreviewUrl('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!isValid) return;
    await onCreateMission({
      title: form.title.trim(),
      categoryId: form.categoryId,
      missionImageFile: form.missionImageFile,
      missionShortVideoFile: form.missionShortVideoFile,
      rewardAudioFile: form.rewardAudioFile,
      rewardVideoFile: form.rewardVideoFile,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>Create Star Cam Mission</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            Fill out mission details first, then upload optional media assets. The layout is compact and optimized for faster authoring.
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px' }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      size="small"
                      label="Mission Title"
                      placeholder="Nature Hunt 1"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      size="small"
                      label="Category"
                      select
                      value={form.categoryId}
                      onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                      fullWidth
                    >
                      {categories.map((category) => (
                        <MenuItem key={category._id} value={category._id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Stack spacing={1}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Mission Image</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recommended square image for cleaner table previews.
                    </Typography>
                  </Box>
                  <input
                    ref={imageInputRef}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((prev) => ({ ...prev, missionImageFile: e.target.files?.[0] || null }))}
                  />
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => imageInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click();
                    }}
                    sx={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: '10px',
                      border: imagePreviewUrl ? `1px solid ${theme.palette.divider}` : `1px dashed ${theme.palette.divider}`,
                      overflow: 'hidden',
                      backgroundColor: theme.palette.background.paper,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {imagePreviewUrl ? (
                      <>
                        <Box
                          component="img"
                          src={imagePreviewUrl}
                          alt="Mission image preview"
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
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Click to upload image
                      </Typography>
                    )}
                  </Box>
                </Stack>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px' }}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700 }}>Reward Audio</Typography>
                    <input
                      ref={audioInputRef}
                      hidden
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setForm((prev) => ({ ...prev, rewardAudioFile: e.target.files?.[0] || null }))}
                    />
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => audioInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') audioInputRef.current?.click();
                      }}
                      sx={{
                        minHeight: 56,
                        borderRadius: '10px',
                        border: audioPreviewUrl ? `1px solid ${theme.palette.divider}` : `1px dashed ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0,
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      {audioPreviewUrl ? (
                        <>
                          <Box component="audio" controls src={audioPreviewUrl} sx={{ width: '100%', display: 'block' }} />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              audioInputRef.current?.click();
                            }}
                            sx={{ position: 'absolute', top: 8, right: 8, minWidth: 'unset', px: 1, py: 0.25 }}
                          >
                            Change
                          </Button>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Click to upload reward audio
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Paper>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack spacing={1} sx={{ height: '100%' }}>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px' }}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700 }}>Mission Short Video</Typography>
                    <input
                      ref={videoInputRef}
                      hidden
                      type="file"
                      accept="video/*"
                      onChange={(e) => setForm((prev) => ({ ...prev, missionShortVideoFile: e.target.files?.[0] || null }))}
                    />
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => videoInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') videoInputRef.current?.click();
                      }}
                      sx={{
                        width: '100%',
                      maxWidth: 420,
                        aspectRatio: '1 / 1',
                        borderRadius: '10px',
                        border: videoPreviewUrl ? `1px solid ${theme.palette.divider}` : `1px dashed ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      {videoPreviewUrl ? (
                        <>
                          <Box
                            component="video"
                            src={videoPreviewUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              videoInputRef.current?.click();
                            }}
                            sx={{ position: 'absolute', top: 8, right: 8, minWidth: 'unset', px: 1, py: 0.25 }}
                          >
                            Change
                          </Button>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Click to upload video
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>


                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px' }}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700 }}>Reward Video (Optional)</Typography>
                    <input
                      ref={rewardVideoInputRef}
                      hidden
                      type="file"
                      accept="video/*"
                      onChange={(e) => setForm((prev) => ({ ...prev, rewardVideoFile: e.target.files?.[0] || null }))}
                    />
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => rewardVideoInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') rewardVideoInputRef.current?.click();
                      }}
                      sx={{
                        width: '100%',
                        maxWidth: 420,
                        aspectRatio: '1 / 1',
                        borderRadius: '10px',
                        border: rewardVideoPreviewUrl ? `1px solid ${theme.palette.divider}` : `1px dashed ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      {rewardVideoPreviewUrl ? (
                        <>
                          <Box
                            component="video"
                            src={rewardVideoPreviewUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              rewardVideoInputRef.current?.click();
                            }}
                            sx={{ position: 'absolute', top: 8, right: 8, minWidth: 'unset', px: 1, py: 0.25 }}
                          >
                            Change
                          </Button>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Click to upload reward video
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Tip: You can create first, then update media later if needed.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={creating}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || creating}>
          {creating ? 'Creating...' : 'Create Mission'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StarCamMissionCreateModal;
