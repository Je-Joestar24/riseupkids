import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

/** Square Star Cam preview: crop wide video sides (object-fit cover), no re-encoding. */
const starCamVideoSquareContainerSx = {
  width: '100%',
  maxWidth: 420,
  aspectRatio: '1 / 1',
  overflow: 'hidden',
};

const starCamVideoSquareMediaSx = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  pointerEvents: 'none',
};

const initialForm = {
  title: '',
  categoryId: '',
  missionImageFile: null,
  missionShortVideoFile: null,
  rewardAudioFile: null,
  rewardVideoFile: null,
};

const StarCamMissionCreateModal = ({
  open,
  onClose,
  categories = [],
  categoriesLoading = false,
  onCreateMission,
  onEditMission,
  editingMission = null,
  creating = false,
}) => {
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

  const isEditMode = Boolean(editingMission?._id);
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
    if (!open) return;
    if (isEditMode) {
      setForm({
        title: editingMission?.title || '',
        categoryId: editingMission?.category?._id || editingMission?.categoryId || '',
        missionImageFile: null,
        missionShortVideoFile: null,
        rewardAudioFile: null,
        rewardVideoFile: null,
      });
      setImagePreviewUrl(editingMission?.missionImageUrl || editingMission?.missionImage?.url || '');
      setVideoPreviewUrl(editingMission?.missionShortVideoUrl || editingMission?.missionShortVideo?.url || '');
      setAudioPreviewUrl(editingMission?.rewardAudioUrl || editingMission?.rewardAudio?.url || '');
      setRewardVideoPreviewUrl(editingMission?.rewardVideoUrl || editingMission?.rewardVideo?.url || '');
      return;
    }
    setForm(initialForm);
    setImagePreviewUrl('');
    setVideoPreviewUrl('');
    setAudioPreviewUrl('');
    setRewardVideoPreviewUrl('');
  }, [open, isEditMode, editingMission]);

  useEffect(() => {
    if (open) return;
    setForm(initialForm);
    setImagePreviewUrl('');
    setVideoPreviewUrl('');
    setAudioPreviewUrl('');
    setRewardVideoPreviewUrl('');
  }, [open]);

  const handleSubmit = async () => {
    if (!isValid) return;
    const payload = {
      title: form.title.trim(),
      categoryId: form.categoryId,
      missionImageFile: form.missionImageFile,
      missionShortVideoFile: form.missionShortVideoFile,
      rewardAudioFile: form.rewardAudioFile,
      rewardVideoFile: form.rewardVideoFile,
    };
    if (isEditMode) {
      await onEditMission(editingMission._id, payload);
    } else {
      await onCreateMission(payload);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEditMode ? 'Edit Star Cam Mission' : 'Create Star Cam Mission'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            Fill out mission details first, then upload optional media assets. The layout is compact and optimized for faster authoring.
          </Typography>
          {!categoriesLoading && categories.length === 0 ? (
            <Alert severity="warning" role="status">
              No Star Cam categories were returned from the server. Ensure you are signed in as an admin or teacher, then run the
              category seeder from the backend: <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>npm run seed:starcam-categories</Typography>.
            </Alert>
          ) : null}
          <Grid container spacing={1} >
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
                      inputProps={{ 'aria-label': 'Mission title' }}
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
                      disabled={categoriesLoading || categories.length === 0}
                      helperText={
                        categoriesLoading
                          ? 'Loading categories…'
                          : categories.length === 0
                            ? 'Add categories in the database to continue.'
                            : undefined
                      }
                      SelectProps={{
                        endAdornment: categoriesLoading ? (
                          <InputAdornment position="end" sx={{ mr: 3 }}>
                            <CircularProgress color="inherit" size={18} aria-label="Loading categories" />
                          </InputAdornment>
                        ) : undefined,
                      }}
                      inputProps={{ 'aria-label': 'Mission category' }}
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
                      Preview is a square crop (cover): non-square images fill the frame and center automatically.
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
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            display: 'block',
                            pointerEvents: 'none',
                          }}
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
                      className="star-cam-video-container"
                      aria-label={videoPreviewUrl ? 'Mission short video preview, click to change file' : 'Upload mission short video'}
                      sx={{
                        ...starCamVideoSquareContainerSx,
                        borderRadius: '10px',
                        border: videoPreviewUrl ? `1px solid ${theme.palette.divider}` : `1px dashed ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      {videoPreviewUrl ? (
                        <>
                          <Box
                            component="video"
                            className="star-cam-video-container__media"
                            src={videoPreviewUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            aria-hidden="true"
                            sx={starCamVideoSquareMediaSx}
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
                      className="star-cam-video-container"
                      aria-label={rewardVideoPreviewUrl ? 'Reward video preview, click to change file' : 'Upload reward video'}
                      sx={{
                        ...starCamVideoSquareContainerSx,
                        borderRadius: '10px',
                        border: rewardVideoPreviewUrl ? `1px solid ${theme.palette.divider}` : `1px dashed ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      {rewardVideoPreviewUrl ? (
                        <>
                          <Box
                            component="video"
                            className="star-cam-video-container__media"
                            src={rewardVideoPreviewUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            aria-hidden="true"
                            sx={starCamVideoSquareMediaSx}
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
            {isEditMode ? 'Tip: Only upload files you want to replace.' : 'Tip: You can create first, then update media later if needed.'}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={creating}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || creating}>
          {creating ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Mission')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StarCamMissionCreateModal;
