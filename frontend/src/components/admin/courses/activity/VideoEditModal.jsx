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
  FormControlLabel,
  FormLabel,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  IconButton,
  Radio,
  RadioGroup,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES, VIDEO_COMPLETION_TYPES } from '../../../../services/contentService';
import { BACKEND_BASE_URL } from '../../../../config/constants';
import CMSBooksSelectRightDrawer from './CMSBooksSelectRightDrawer';

/**
 * VideoEditModal Component
 * 
 * Modal for editing videos
 * Can only edit: title, description, coverImage (thumbnail), duration, starsAwarded, isPublished
 * Video file and SCORM file cannot be changed
 */
const VideoEditModal = ({ open, onClose, videoId, onSuccess }) => {
  const theme = useTheme();
  const {
    fetchContent,
    updateContentData,
    loading,
    currentContent,
    clearContent,
  } = useContent();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: null,
    starsAwarded: 10,
    isPublished: false,
    completionContentType: VIDEO_COMPLETION_TYPES.NONE,
    cmsBookId: '',
    selectedCmsBook: null,
  });

  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [selectedHtml5File, setSelectedHtml5File] = useState(null);
  const [currentCoverImage, setCurrentCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [cmsBooksDrawerOpen, setCmsBooksDrawerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  // Fetch video data when modal opens
  useEffect(() => {
    if (open && videoId) {
      const hasCorrectVideo = currentContent && currentContent._id === videoId;
      const isDifferentVideo = lastFetchedIdRef.current !== videoId;
      
      if (!hasCorrectVideo && !isFetchingRef.current && isDifferentVideo) {
        isFetchingRef.current = true;
        lastFetchedIdRef.current = videoId;
        fetchContent(CONTENT_TYPES.VIDEO, videoId)
          .catch((error) => {
            console.error('Error fetching video:', error);
          })
          .finally(() => {
            isFetchingRef.current = false;
          });
      }
    } else if (!open) {
      setIsInitialized(false);
      isFetchingRef.current = false;
      lastFetchedIdRef.current = null;
      clearContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoId]);

  // Update form data when currentContent changes
  useEffect(() => {
    if (open && videoId && currentContent && currentContent._id === videoId && !isInitialized) {
      setFormData({
        title: currentContent.title || '',
        description: currentContent.description || '',
        duration: currentContent.duration || null,
        starsAwarded: currentContent.starsAwarded || 10,
        isPublished: currentContent.isPublished || false,
        completionContentType: currentContent.completionContentType || VIDEO_COMPLETION_TYPES.NONE,
        cmsBookId: typeof currentContent.cmsBookId === 'object' ? currentContent.cmsBookId?._id || '' : currentContent.cmsBookId || '',
        selectedCmsBook: typeof currentContent.cmsBookId === 'object' ? currentContent.cmsBookId : null,
      });
      // Videos use 'thumbnail' field, but we map it to 'coverImage' in the slice
      setCurrentCoverImage(currentContent.coverImage || currentContent.thumbnail);
      setSelectedCoverImage(null);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoId, currentContent?._id]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverImageChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedCoverImage(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  const handleHtml5FileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedHtml5File(event.target.files[0]);
    }
  };

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleSubmit = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description || '');
      if (formData.duration) {
        formDataToSend.append('duration', formData.duration);
      }
      formDataToSend.append('starsAwarded', formData.starsAwarded);
      formDataToSend.append('isPublished', formData.isPublished);
      formDataToSend.append('completionContentType', formData.completionContentType);
      if (formData.completionContentType === VIDEO_COMPLETION_TYPES.BUILTIN) {
        if (!formData.cmsBookId) {
          alert('Please select a built-in CMS book for the video follow-up.');
          return;
        }
        formDataToSend.append('cmsBookId', formData.cmsBookId);
      }
      if (formData.completionContentType === VIDEO_COMPLETION_TYPES.HTML5 && selectedHtml5File) {
        formDataToSend.append('html5File', selectedHtml5File);
      }

      if (selectedCoverImage) {
        formDataToSend.append('coverImage', selectedCoverImage);
      }

      await updateContentData(CONTENT_TYPES.VIDEO, videoId, formDataToSend);
      
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error updating video:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      duration: null,
      starsAwarded: 10,
      isPublished: false,
      completionContentType: VIDEO_COMPLETION_TYPES.NONE,
      cmsBookId: '',
      selectedCmsBook: null,
    });
    setSelectedCoverImage(null);
    setSelectedHtml5File(null);
    setCurrentCoverImage(null);
    setIsInitialized(false);
    isFetchingRef.current = false;
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    onClose();
  };

  const resolveMediaUrl = (maybeUrl) => {
    if (!maybeUrl || typeof maybeUrl !== 'string') return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    return `${BACKEND_BASE_URL}${maybeUrl}`;
  };

  const displayCoverImage = selectedCoverImage && imagePreviewUrl
    ? imagePreviewUrl
    : currentCoverImage
    ? resolveMediaUrl(currentCoverImage)
    : null;

  const bentoCardSx = {
    height: '100%',
    borderRadius: '20px',
    borderColor: theme.palette.divider,
    p: { xs: 2, md: 2.5 },
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))'
        : 'linear-gradient(145deg, #ffffff, #fbfaf7)',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.05)',
  };

  const bentoTitleSx = {
    fontFamily: 'Quicksand, sans-serif',
    fontWeight: 700,
    mb: 0.5,
  };

  return (
    <>
      <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          fontFamily: 'Quicksand, sans-serif',
          width: 'min(1280px, calc(100vw - 32px))',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          component="span"
          variant="h5"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
          }}
        >
          Edit Video
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3} sx={{ marginTop: '20px' }}>
          {/* Title */}
          <TextField
            label="Video Title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />

          {/* Description */}
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              <Paper variant="outlined" sx={bentoCardSx}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography sx={bentoTitleSx}>Cover image</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                      Optional thumbnail displayed on the video card.
                    </Typography>
                  </Box>

                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="video-cover-image-upload-edit"
                    type="file"
                    onChange={handleCoverImageChange}
                  />
                  <Box
                    component="label"
                    htmlFor="video-cover-image-upload-edit"
                    role="button"
                    tabIndex={0}
                    aria-label={displayCoverImage ? 'Change video cover image' : 'Upload video cover image'}
                    sx={{
                      width: '100%',
                      ...(displayCoverImage
                        ? {
                            borderRadius: 0,
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.grey[100],
                          }
                        : {
                            aspectRatio: '1.618 / 1',
                            minHeight: { xs: 220, md: 360 },
                            borderRadius: '18px',
                            border: `2px dashed ${theme.palette.divider}`,
                            background:
                              theme.palette.mode === 'dark'
                                ? 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                                : 'linear-gradient(145deg, #fffaf0, #f8fafc)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }),
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: '160ms ease',
                      '&:hover': {
                        borderColor: theme.palette.orange?.main || theme.palette.primary.main,
                        ...(!displayCoverImage && { transform: 'translateY(-1px)' }),
                      },
                    }}
                  >
                    {displayCoverImage ? (
                      <>
                        <Box
                          component="img"
                          src={displayCoverImage}
                          alt="Cover preview"
                          sx={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            objectFit: 'contain',
                          }}
                        />
                        <Chip
                          label={selectedCoverImage ? 'Change new cover' : 'Change cover'}
                          size="small"
                          sx={{ position: 'absolute', top: 12, right: 12, fontFamily: 'Quicksand, sans-serif' }}
                        />
                      </>
                    ) : (
                      <Stack alignItems="center" spacing={1.25} sx={{ px: 3, textAlign: 'center' }}>
                        <CloudUploadIcon sx={{ fontSize: 56, color: theme.palette.text.secondary }} aria-hidden />
                        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                          Upload cover image
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                          Use a wide rectangular thumbnail for the best course card fit.
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                  {selectedCoverImage && (
                    <Chip
                      label={selectedCoverImage.name}
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                      onDelete={() => setSelectedCoverImage(null)}
                    />
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Stack spacing={2} sx={{ height: '100%' }}>
                <Paper variant="outlined" sx={bentoCardSx}>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography sx={bentoTitleSx}>Optional follow-up</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                        Leave this as No follow-up activity when the video should end normally.
                      </Typography>
                    </Box>
                    <RadioGroup
                      value={formData.completionContentType}
                      onChange={(e) => {
                        const selectedType = e.target.value;
                        handleInputChange('completionContentType', selectedType);
                        if (selectedType !== VIDEO_COMPLETION_TYPES.BUILTIN) {
                          handleInputChange('cmsBookId', '');
                          handleInputChange('selectedCmsBook', null);
                        }
                        if (selectedType !== VIDEO_COMPLETION_TYPES.HTML5) {
                          setSelectedHtml5File(null);
                        }
                      }}
                      aria-label="Choose optional activity shown after the video finishes"
                    >
                      <FormControlLabel value={VIDEO_COMPLETION_TYPES.NONE} control={<Radio />} label="No follow-up activity" />
                      <FormControlLabel value={VIDEO_COMPLETION_TYPES.HTML5} control={<Radio />} label="HTML5 package" />
                      <FormControlLabel value={VIDEO_COMPLETION_TYPES.BUILTIN} control={<Radio />} label="Built-in CMS book" />
                    </RadioGroup>

                    {formData.completionContentType === VIDEO_COMPLETION_TYPES.HTML5 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', display: 'block', mb: 1 }}>
                          {currentContent?.html5PackageId
                            ? 'Upload a ZIP only if you want to replace the current HTML5 package.'
                            : 'Required only when HTML5 package is selected.'}
                        </Typography>
                        <input
                          accept=".zip,application/zip,application/x-zip-compressed"
                          style={{ display: 'none' }}
                          id="edit-video-html5-upload"
                          type="file"
                          aria-label="Select HTML5 ZIP follow-up for video"
                          onChange={handleHtml5FileChange}
                        />
                        <label htmlFor="edit-video-html5-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                            sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                          >
                            {currentContent?.html5PackageId ? 'Replace HTML5 package (ZIP)' : 'Upload HTML5 package (ZIP)'}
                          </Button>
                        </label>
                        {selectedHtml5File && (
                          <Chip
                            label={selectedHtml5File.name}
                            size="small"
                            sx={{ mt: 1 }}
                            onDelete={() => setSelectedHtml5File(null)}
                          />
                        )}
                      </Box>
                    )}

                    {formData.completionContentType === VIDEO_COMPLETION_TYPES.BUILTIN && (
                      <Box>
                        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, mb: 1 }}>
                          {formData.selectedCmsBook?.title || 'No built-in book selected'}
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => setCmsBooksDrawerOpen(true)}
                          fullWidth
                          sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                        >
                          {formData.cmsBookId ? 'Change built-in book' : 'Select built-in book'}
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={bentoCardSx}>
                  <Stack spacing={1.5}>
                    <Typography sx={bentoTitleSx}>Rewards, timing, and status</Typography>
                    <TextField
                      label="Duration (seconds)"
                      type="number"
                      value={formData.duration || ''}
                      onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || null)}
                      inputProps={{ min: 0 }}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                    />
                    <TextField
                      label="Stars Awarded"
                      type="number"
                      value={formData.starsAwarded}
                      onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 0 }}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                    />
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.isPublished ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('isPublished', e.target.value === 'true')}
                        label="Status"
                        sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                      >
                        <MenuItem value="false">Draft</MenuItem>
                        <MenuItem value="true">Published</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Button
          onClick={handleClose}
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
          disabled={loading || !formData.title}
          sx={{
            backgroundColor: theme.palette.orange.main,
            color: theme.palette.textCustom.inverse,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: theme.palette.orange.dark,
            },
          }}
        >
          {loading ? 'Updating...' : 'Update Video'}
        </Button>
      </DialogActions>
      </Dialog>

      <CMSBooksSelectRightDrawer
        open={cmsBooksDrawerOpen}
        onClose={() => setCmsBooksDrawerOpen(false)}
        selectedBookId={formData.cmsBookId}
        onSelectBook={(book) => {
          handleInputChange('cmsBookId', book?._id || '');
          handleInputChange('selectedCmsBook', book || null);
          setCmsBooksDrawerOpen(false);
        }}
      />
    </>
  );
};

export default VideoEditModal;

