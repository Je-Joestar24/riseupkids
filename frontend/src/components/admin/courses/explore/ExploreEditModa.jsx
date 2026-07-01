import React, { useState, useEffect, useRef } from 'react';
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
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  InsertLink as InsertLinkIcon,
} from '@mui/icons-material';
import { useExplore } from '../../../../hooks/exploreHook';
import { getVideoTypeOptions, EXPLORE_VIDEO_MAX_BYTES } from '../../../../constants/exploreVideoTypes';
import { looksLikeBunnyExploreEmbedUrl } from '../../../../utils/bunnyExploreEmbed';
import { BACKEND_BASE_URL } from '../../../../config/constants';

/**
 * ExploreEditModal — edit explore video with the same bento layout as ExploreAddModal.
 */
const ExploreEditModal = ({ open, onClose, contentId }) => {
  const theme = useTheme();
  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const {
    fetchContent,
    updateExploreContentData,
    loading,
    currentExploreContent,
    clearContent,
    getCoverImageUrl,
    prepareExploreFormData,
    uploadingExplore,
    uploadProgressPercent,
  } = useExplore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoType: 'replay',
    videoSource: 'upload',
    embedUrl: '',
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
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  const resolveMediaUrl = (maybeUrl) => {
    if (!maybeUrl || typeof maybeUrl !== 'string') return '';
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    return `${BACKEND_BASE_URL}${maybeUrl.startsWith('/') ? maybeUrl : `/${maybeUrl}`}`;
  };

  useEffect(() => {
    if (open && contentId) {
      const hasCorrectContent = currentExploreContent && currentExploreContent._id === contentId;
      const isDifferentContent = lastFetchedIdRef.current !== contentId;

      if (!hasCorrectContent && !isFetchingRef.current && isDifferentContent) {
        isFetchingRef.current = true;
        lastFetchedIdRef.current = contentId;
        fetchContent(contentId)
          .catch((error) => {
            console.error('Error fetching explore content:', error);
          })
          .finally(() => {
            isFetchingRef.current = false;
          });
      }
    } else if (!open) {
      setIsInitialized(false);
      isFetchingRef.current = false;
      lastFetchedIdRef.current = null;
      setVideoPreviewUrl('');
      setImagePreviewUrl(null);
      setCurrentVideoUrl('');
      setCurrentCoverImageUrl(null);
      setSelectedFiles({ videoFile: null, coverImage: null });
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
      clearContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentId]);

  useEffect(() => {
    if (open && contentId && currentExploreContent && currentExploreContent._id === contentId && !isInitialized) {
      const isEmbed = currentExploreContent.videoFile?.videoSource === 'embed';
      const existingVideoUrl = isEmbed
        ? ''
        : resolveMediaUrl(
            currentExploreContent.videoFileUrl
            || currentExploreContent.videoFile?.url
            || ''
          );

      setFormData({
        title: currentExploreContent.title || '',
        description: currentExploreContent.description || '',
        videoType: currentExploreContent.videoType || 'replay',
        videoSource: isEmbed ? 'embed' : 'upload',
        embedUrl: isEmbed
          ? (currentExploreContent.videoFile?.embedUrl || currentExploreContent.videoFile?.url || '')
          : '',
        starsAwarded: currentExploreContent.starsAwarded || 10,
        duration: currentExploreContent.duration ?? '',
        isFeatured: currentExploreContent.isFeatured || false,
        isPublished: currentExploreContent.isPublished || false,
      });

      setCurrentVideoUrl(existingVideoUrl);
      setCurrentCoverImageUrl(
        currentExploreContent.coverImage ? getCoverImageUrl(currentExploreContent.coverImage) : null
      );
      setSelectedFiles({ videoFile: null, coverImage: null });
      setVideoPreviewUrl('');
      setImagePreviewUrl(null);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentId, currentExploreContent?._id]);

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

  const handleVideoSourceChange = (value) => {
    if (value === 'embed') {
      setSelectedFiles((prev) => ({ ...prev, videoFile: null }));
      if (videoInputRef.current) videoInputRef.current.value = '';
      setFormData((prev) => ({
        ...prev,
        videoSource: 'embed',
        embedUrl:
          currentExploreContent?.videoFile?.videoSource === 'embed'
            ? (
                currentExploreContent.videoFile.embedUrl
                || currentExploreContent.videoFile.url
                || prev.embedUrl
              )
            : prev.embedUrl,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      videoSource: 'upload',
      embedUrl: '',
    }));
  };

  const handleVideoFileChange = (fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    if (file && typeof file.size === 'number' && file.size > EXPLORE_VIDEO_MAX_BYTES) {
      window.alert(
        `This video is too large (${(file.size / (1024 * 1024)).toFixed(0)} MB). Maximum is about ${Math.round(EXPLORE_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`
      );
      if (videoInputRef.current) videoInputRef.current.value = '';
      setSelectedFiles((prev) => ({ ...prev, videoFile: null }));
      return;
    }
    setSelectedFiles((prev) => ({ ...prev, videoFile: file }));
  };

  const handleCoverFileChange = (fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    setSelectedFiles((prev) => ({ ...prev, coverImage: file }));
  };

  const displayVideoPreviewUrl = videoPreviewUrl || (formData.videoSource === 'upload' ? currentVideoUrl : '');

  const displayCoverPreviewUrl = imagePreviewUrl || currentCoverImageUrl;

  const embedPreviewUrl = formData.embedUrl?.trim() || '';

  const handleSubmit = async () => {
    try {
      if (!formData.title.trim()) {
        alert('Title cannot be empty');
        return;
      }

      if (formData.videoSource === 'embed') {
        if (!formData.embedUrl?.trim()) {
          alert('Please paste the Bunny embed link (iframe URL).');
          return;
        }
        if (!looksLikeBunnyExploreEmbedUrl(formData.embedUrl)) {
          alert(
            'Embed link must be HTTPS and look like:\nhttps://iframe.mediadelivery.net/embed/...'
          );
          return;
        }
      }

      const formDataToSend = prepareExploreFormData(
        formData,
        formData.videoSource === 'upload' ? selectedFiles.videoFile : null,
        selectedFiles.coverImage
      );

      const result = await updateExploreContentData(contentId, formDataToSend);
      const savedVideoType = result?.response?.data?.videoType || formData.videoType;
      handleClose({ videoType: savedVideoType });
    } catch (error) {
      console.error('Error updating explore content:', error);
    }
  };

  /** @param {{ videoType?: string } | void} syncPayload When present after save, parent syncs filters/URL to this video type. */
  const handleClose = (syncPayload) => {
    setIsInitialized(false);
    setVideoPreviewUrl('');
    setImagePreviewUrl(null);
    setCurrentVideoUrl('');
    setCurrentCoverImageUrl(null);
    setSelectedFiles({ videoFile: null, coverImage: null });
    onClose(syncPayload);
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

  if (!currentExploreContent && open && contentId) {
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
        <DialogContent sx={{ padding: 3, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
            Loading content...
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

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
          Edit Explore Content
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={uploadingExplore}
          aria-label="Close edit explore dialog"
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
          Update the main video (upload or Bunny iframe link), metadata, and cover. Leave media unchanged if you only
          edit details.
          {formData.videoSource === 'upload' && (
            <>
              {' '}
              Large replacements show progress below the preview. Maximum file size is about{' '}
              {Math.round(EXPLORE_VIDEO_MAX_BYTES / (1024 * 1024))} MB.
            </>
          )}
        </Typography>

        <Grid container spacing={2}>
          {/* Bento: primary video cell */}
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={paperSx}>
              <Stack spacing={1.5}>
                <FormControl fullWidth disabled={uploadingExplore}>
                  <InputLabel id="explore-edit-video-source-label">Main video</InputLabel>
                  <Select
                    labelId="explore-edit-video-source-label"
                    id="explore-edit-video-source"
                    value={formData.videoSource}
                    label="Main video"
                    onChange={(e) => handleVideoSourceChange(e.target.value)}
                    aria-label="How the main explore video is provided"
                    sx={{
                      borderRadius: '10px',
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  >
                    <MenuItem value="upload">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CloudUploadIcon fontSize="small" aria-hidden />
                        <span>Upload video file</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="embed">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <InsertLinkIcon fontSize="small" aria-hidden />
                        <span>Bunny embed link (iframe)</span>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>

                {formData.videoSource === 'upload' ? (
                  <>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}>
                        Video file
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                        Click the box to replace the current video. Preview plays here (muted).
                      </Typography>
                    </Box>

                    <input
                      ref={videoInputRef}
                      accept="video/*"
                      style={{ display: 'none' }}
                      id="explore-edit-video-file"
                      type="file"
                      aria-label="Select video file to replace current explore video"
                      onChange={(e) => handleVideoFileChange(e.target.files)}
                    />

                    <Box
                      role="button"
                      tabIndex={uploadingExplore ? -1 : 0}
                      aria-label={displayVideoPreviewUrl ? 'Change explore video file' : 'Upload explore video file'}
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
                        border: displayVideoPreviewUrl
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
                      {displayVideoPreviewUrl ? (
                        <>
                          <Box
                            component="video"
                            src={displayVideoPreviewUrl}
                            controls
                            muted
                            playsInline
                            aria-label="Explore video preview"
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block',
                              pointerEvents: 'auto',
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
                            {selectedFiles.videoFile ? 'Change video' : 'Replace video'}
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
                  </>
                ) : (
                  <>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}>
                        Bunny iframe URL
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                        Paste the link from Bunny (must start with https://iframe.mediadelivery.net/embed/)
                      </Typography>
                    </Box>
                    <TextField
                      value={formData.embedUrl}
                      onChange={(e) => handleInputChange('embedUrl', e.target.value)}
                      placeholder="https://iframe.mediadelivery.net/embed/…"
                      fullWidth
                      multiline
                      minRows={2}
                      disabled={uploadingExplore}
                      inputProps={{ 'aria-label': 'Bunny Stream iframe embed URL' }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          fontFamily: 'Quicksand, sans-serif',
                        },
                      }}
                    />
                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        borderRadius: '12px',
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: 'hidden',
                        backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      role="region"
                      aria-label="Bunny embed preview"
                    >
                      {looksLikeBunnyExploreEmbedUrl(embedPreviewUrl) ? (
                        <Box
                          component="iframe"
                          title="Bunny embed preview"
                          src={embedPreviewUrl.trim()}
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                          allowFullScreen
                          sx={{
                            width: '100%',
                            height: '100%',
                            border: 0,
                            display: 'block',
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ px: 2, textAlign: 'center', fontFamily: 'Quicksand, sans-serif' }}>
                          Enter a valid embed URL to see a preview here
                        </Typography>
                      )}
                    </Box>
                  </>
                )}

                {uploadingExplore && (
                  <Box sx={{ mt: 0.5 }} role="status" aria-live="polite">
                    <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', mb: 1 }}>
                      {formData.videoSource === 'embed' ? 'Saving…' : 'Uploading video…'}
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
                  Cover photo{' '}
                  <Typography component="span" color="text.secondary" variant="body2">
                    (optional)
                  </Typography>
                </Typography>
                <input
                  ref={coverInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="explore-edit-cover-image"
                  type="file"
                  aria-label="Select cover image"
                  onChange={(e) => handleCoverFileChange(e.target.files)}
                />
                <Box
                  role="button"
                  tabIndex={uploadingExplore ? -1 : 0}
                  aria-label={displayCoverPreviewUrl ? 'Change cover image' : 'Upload cover image'}
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
                    border: displayCoverPreviewUrl
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
                  {displayCoverPreviewUrl ? (
                    <>
                      <Box
                        component="img"
                        src={displayCoverPreviewUrl}
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
                {selectedFiles.coverImage && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Selected: {selectedFiles.coverImage.name}
                  </Typography>
                )}
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
          disabled={loading || uploadingExplore}
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
          {uploadingExplore
            ? (formData.videoSource === 'embed' ? 'Saving…' : 'Uploading…')
            : loading
              ? 'Loading…'
              : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExploreEditModal;
