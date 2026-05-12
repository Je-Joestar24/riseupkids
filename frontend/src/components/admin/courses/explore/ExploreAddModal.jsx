import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Paper,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useExplore } from '../../../../hooks/exploreHook';
import { getVideoTypeOptions, EXPLORE_VIDEO_MAX_BYTES } from '../../../../constants/exploreVideoTypes';

/**
 * ExploreAddModal — create explore video with bento layout and in-modal video preview (Star Cam–style).
 */
const ExploreAddModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const {
    createNewExploreContent,
    prepareExploreFormData,
    filters,
    uploadingExplore,
    uploadProgressPercent,
  } = useExplore();

  const getInitialVideoType = useCallback(() => {
    const urlVideoType = searchParams.get('videoType');
    const filterVideoType = filters?.videoType;
    return urlVideoType || filterVideoType || 'replay';
  }, [searchParams, filters?.videoType]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'video',
    videoType: 'replay',
    starsAwarded: 10,
    duration: '',
    isFeatured: false,
    isPublished: false,
  });

  const [selectedFiles, setSelectedFiles] = useState({
    videoFile: null,
    coverImage: null,
  });

  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');

  const resetState = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      type: 'video',
      videoType: 'replay',
      starsAwarded: 10,
      duration: '',
      isFeatured: false,
      isPublished: false,
    });
    setSelectedFiles({
      videoFile: null,
      coverImage: null,
    });
    setImagePreviewUrl(null);
    setVideoPreviewUrl('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    const currentVideoType = getInitialVideoType();
    setFormData((prev) => ({ ...prev, videoType: currentVideoType }));
  }, [open, searchParams, filters?.videoType, getInitialVideoType, resetState]);

  useEffect(() => {
    if (!selectedFiles.videoFile) {
      setVideoPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedFiles.videoFile);
    setVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFiles.videoFile]);

  useEffect(() => {
    if (!selectedFiles.coverImage) {
      setImagePreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(selectedFiles.coverImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFiles.coverImage]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVideoFileChange = (fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    if (file && typeof file.size === 'number' && file.size > EXPLORE_VIDEO_MAX_BYTES) {
      window.alert(
        `This video is too large (${(file.size / (1024 * 1024)).toFixed(0)} MB). Maximum is about ${Math.round(EXPLORE_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`
      );
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
      setSelectedFiles((prev) => ({ ...prev, videoFile: null }));
      return;
    }
    setSelectedFiles((prev) => ({ ...prev, videoFile: file }));
  };

  const handleCoverFileChange = (fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    setSelectedFiles((prev) => ({ ...prev, coverImage: file }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title.trim()) {
        alert('Please provide a title');
        return;
      }

      if (!selectedFiles.videoFile) {
        alert('Please upload a video file');
        return;
      }

      const formDataToSend = prepareExploreFormData(
        formData,
        selectedFiles.videoFile,
        selectedFiles.coverImage
      );

      const result = await createNewExploreContent(formDataToSend);
      const savedVideoType = result?.data?.videoType || formData.videoType;

      if (onSuccess) {
        onSuccess({ videoType: savedVideoType });
      }
      handleClose();
    } catch (error) {
      console.error('Error creating explore content:', error);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDialogClose = (_event, reason) => {
    if (uploadingExplore && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    handleClose();
  };

  const paperSx = {
    p: 2,
    borderRadius: '14px',
    height: '100%',
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      disableEscapeKeyDown={uploadingExplore}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '20px',
          fontFamily: 'Quicksand, sans-serif',
          maxWidth: 1080,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `2px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.75rem',
            color: theme.palette.text.primary,
          }}
        >
          Add Explore Content
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={uploadingExplore}
          aria-label="Close add explore dialog"
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.custom?.bgTertiary || 'action.hover',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3, pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'Quicksand, sans-serif' }}>
          Choose a video in the preview area, then complete details on the right. Large uploads show progress below
          the preview. Main video can be up to about {Math.round(EXPLORE_VIDEO_MAX_BYTES / (1024 * 1024))} MB (server
          limit); uploads may take a while on slower connections.
        </Typography>

        <Grid container spacing={2}>
          {/* Bento: primary video cell */}
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={paperSx}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}>
                    Main video <Typography component="span" color="error.main">*</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Click the box to pick a file. Preview plays here before upload (muted).
                  </Typography>
                </Box>

                <input
                  ref={videoInputRef}
                  accept="video/*"
                  style={{ display: 'none' }}
                  id="explore-add-video-file"
                  type="file"
                  aria-label="Select video file to upload"
                  onChange={(e) => handleVideoFileChange(e.target.files)}
                />

                <Box
                  role="button"
                  tabIndex={uploadingExplore ? -1 : 0}
                  aria-label={videoPreviewUrl ? 'Change explore video file' : 'Upload explore video file'}
                  onClick={() => !uploadingExplore && videoInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (uploadingExplore) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      videoInputRef.current?.click();
                    }
                  }}
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: '12px',
                    border: videoPreviewUrl
                      ? `1px solid ${theme.palette.divider}`
                      : `2px dashed ${theme.palette.divider}`,
                    overflow: 'hidden',
                    backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploadingExplore ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    opacity: uploadingExplore ? 0.85 : 1,
                  }}
                >
                  {videoPreviewUrl ? (
                    <>
                      <Box
                        component="video"
                        src={videoPreviewUrl}
                        controls
                        muted
                        playsInline
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        disabled={uploadingExplore}
                        onClick={(e) => {
                          e.stopPropagation();
                          videoInputRef.current?.click();
                        }}
                        sx={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          minWidth: 'unset',
                          px: 1.25,
                          py: 0.5,
                          fontFamily: 'Quicksand, sans-serif',
                        }}
                      >
                        Change video
                      </Button>
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={1} sx={{ px: 2, textAlign: 'center' }}>
                      <CloudUploadIcon color="action" sx={{ fontSize: 40 }} aria-hidden />
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                        Click to upload video
                      </Typography>
                    </Stack>
                  )}
                </Box>

                {selectedFiles.videoFile && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Selected: {selectedFiles.videoFile.name}
                  </Typography>
                )}

                {uploadingExplore && (
                  <Box sx={{ mt: 0.5 }} role="status" aria-live="polite">
                    <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', mb: 1 }}>
                      Uploading video…
                      {uploadProgressPercent != null ? ` ${uploadProgressPercent}%` : ''}
                    </Typography>
                    <LinearProgress
                      variant={uploadProgressPercent != null ? 'determinate' : 'indeterminate'}
                      value={uploadProgressPercent ?? 0}
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Bento: metadata column */}
          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ ...paperSx, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
                fullWidth
                disabled={uploadingExplore}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontFamily: 'Quicksand, sans-serif',
                  },
                }}
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={4}
                fullWidth
                disabled={uploadingExplore}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontFamily: 'Quicksand, sans-serif',
                  },
                }}
              />

              <FormControl fullWidth disabled={uploadingExplore}>
                <InputLabel>Video Type</InputLabel>
                <Select
                  value={formData.videoType}
                  label="Video Type"
                  onChange={(e) => handleInputChange('videoType', e.target.value)}
                  sx={{
                    borderRadius: '10px',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  {getVideoTypeOptions().map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="Duration (sec)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  inputProps={{ min: 0 }}
                  fullWidth
                  disabled={uploadingExplore}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontFamily: 'Quicksand, sans-serif',
                    },
                  }}
                />
                <TextField
                  label="Stars"
                  type="number"
                  value={formData.starsAwarded}
                  onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value, 10) || 0)}
                  inputProps={{ min: 0 }}
                  fullWidth
                  disabled={uploadingExplore}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontFamily: 'Quicksand, sans-serif',
                    },
                  }}
                />
              </Stack>
            </Paper>
          </Grid>

          {/* Bento: cover */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={paperSx}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}>
                  Cover photo <Typography component="span" color="text.secondary" variant="body2">(optional)</Typography>
                </Typography>
                <input
                  ref={coverInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="explore-add-cover-image"
                  type="file"
                  aria-label="Select cover image"
                  onChange={(e) => handleCoverFileChange(e.target.files)}
                />
                <Box
                  role="button"
                  tabIndex={uploadingExplore ? -1 : 0}
                  aria-label={imagePreviewUrl ? 'Change cover image' : 'Upload cover image'}
                  onClick={() => !uploadingExplore && coverInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (uploadingExplore) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      coverInputRef.current?.click();
                    }
                  }}
                  sx={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    maxHeight: 220,
                    borderRadius: '12px',
                    border: imagePreviewUrl
                      ? `1px solid ${theme.palette.divider}`
                      : `2px dashed ${theme.palette.divider}`,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploadingExplore ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    backgroundColor: theme.palette.background.default,
                  }}
                >
                  {imagePreviewUrl ? (
                    <>
                      <Box
                        component="img"
                        src={imagePreviewUrl}
                        alt="Cover preview"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        disabled={uploadingExplore}
                        onClick={(e) => {
                          e.stopPropagation();
                          coverInputRef.current?.click();
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          minWidth: 'unset',
                          px: 1,
                          py: 0.25,
                          fontFamily: 'Quicksand, sans-serif',
                        }}
                      >
                        Change
                      </Button>
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                      Click to upload cover
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Bento: flags */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ ...paperSx, display: 'flex', alignItems: 'center' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isPublished}
                      onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                      color="primary"
                      disabled={uploadingExplore}
                    />
                  }
                  label="Published"
                  sx={{ '& .MuiTypography-root': { fontFamily: 'Quicksand, sans-serif' } }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isFeatured}
                      onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                      color="primary"
                      disabled={uploadingExplore}
                    />
                  }
                  label="Featured"
                  sx={{ '& .MuiTypography-root': { fontFamily: 'Quicksand, sans-serif' } }}
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `2px solid ${theme.palette.border.main}`,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={uploadingExplore}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={uploadingExplore}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
            backgroundColor: theme.palette.orange.main,
            '&:hover': {
              backgroundColor: theme.palette.orange.dark,
            },
          }}
        >
          {uploadingExplore ? 'Uploading…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExploreAddModal;
