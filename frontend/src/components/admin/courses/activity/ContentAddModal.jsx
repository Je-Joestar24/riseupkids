import React, { useState, useEffect } from 'react';
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
  Checkbox,
  Radio,
  RadioGroup,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon, InsertLink as InsertLinkIcon } from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { BOOK_PACKAGE_TYPES, CONTENT_TYPES, VIDEO_COMPLETION_TYPES } from '../../../../services/contentService';
import { looksLikeBunnyExploreEmbedUrl } from '../../../../utils/bunnyExploreEmbed';
import CMSBooksSelectRightDrawer from './CMSBooksSelectRightDrawer';
import BentoCoverImageField from './BentoCoverImageField';
import BentoInstructionVideoField from './BentoInstructionVideoField';

/**
 * ContentAddModal Component
 *
 * Unified modal for creating content items:
 * - Activity (SCORM)
 * - Book (HTML5 ZIP or built-in CMS book)
 * - Video (uploaded file or Bunny iframe embed)
 * - Audio Assignment (reference audio)
 * - Chant (optional audio and instruction video)
 * 
 * Automatically detects current content type from filters/URL
 */
const ContentAddModal = ({ open, onClose, onSuccess, initialContentType, renderAsDrawer = false }) => {
  const theme = useTheme();
  const { createNewContent, loading, filters } = useContent();

  const BOOK_DEFAULT_PACKAGE_TYPE = BOOK_PACKAGE_TYPES.HTML5;

  // Initialize with initialContentType prop, or current content type from filters, or default
  const [contentType, setContentType] = useState(
    initialContentType || filters.contentType || CONTENT_TYPES.ACTIVITY
  );

  // Update content type when modal opens, filters change, or initialContentType changes
  useEffect(() => {
    if (open) {
      // Priority: initialContentType > filters.contentType > default
      const currentType = initialContentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
      setContentType(currentType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filters.contentType, initialContentType]);

  const [formData, setFormData] = useState({
    // common
    title: '',
    description: '',
    isPublished: renderAsDrawer ? true : false, // Default to published when creating from drawer
    tags: [],
    starsAwarded: 15,
    // book-specific
    packageType: BOOK_DEFAULT_PACKAGE_TYPE, // frontend defaults to HTML5; SCORM is concealed for now
    language: 'en',
    readingLevel: 'beginner',
    estimatedReadingTime: '',
    requiredReadingCount: 5,
    totalStarsAwarded: 50,
    cmsBookId: '',
    selectedCmsBook: null,
    // video-specific
    duration: '',
    videoSource: 'upload',
    embedUrl: '',
    videoCompletionType: VIDEO_COMPLETION_TYPES.NONE,
    // audio assignment / chant instruction video
    instructionVideoSource: 'upload',
    instructionVideoEmbedUrl: '',
    // audio assignment-specific
    instructions: '',
    estimatedDuration: '',
    isStarAssignment: false,
  });

  const [selectedFiles, setSelectedFiles] = useState({
    scormFile: null,
    coverImage: null,
    videoFile: null,
    html5File: null,
    referenceAudio: null,
    audio: null, // For chants
    instructionVideo: null, // For audio assignments & chants
  });
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [instructionVideoPreviewUrl, setInstructionVideoPreviewUrl] = useState('');
  const [cmsBooksDrawerOpen, setCmsBooksDrawerOpen] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    setSelectedFiles((prev) => ({ ...prev, [field]: file }));

    if (field === 'videoFile') {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(file ? URL.createObjectURL(file) : '');
    }

    if (field === 'coverImage') {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(file ? URL.createObjectURL(file) : '');
    }

    if (field === 'instructionVideo') {
      if (instructionVideoPreviewUrl) URL.revokeObjectURL(instructionVideoPreviewUrl);
      setInstructionVideoPreviewUrl(file ? URL.createObjectURL(file) : '');
    }
  };

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      if (instructionVideoPreviewUrl) URL.revokeObjectURL(instructionVideoPreviewUrl);
    };
  }, [videoPreviewUrl, coverPreviewUrl, instructionVideoPreviewUrl]);

  const resetState = () => {
    // Reset to current content type (not always ACTIVITY)
    const currentType = filters.contentType || CONTENT_TYPES.ACTIVITY;
    setContentType(currentType);
    setFormData({
      title: '',
      description: '',
      isPublished: renderAsDrawer ? true : false,
      tags: [],
      starsAwarded: 15,
      packageType: BOOK_DEFAULT_PACKAGE_TYPE,
      language: 'en',
      readingLevel: 'beginner',
      estimatedReadingTime: '',
      requiredReadingCount: 5,
      totalStarsAwarded: 50,
      cmsBookId: '',
      selectedCmsBook: null,
      duration: '',
      videoSource: 'upload',
      embedUrl: '',
      videoCompletionType: VIDEO_COMPLETION_TYPES.NONE,
      instructionVideoSource: 'upload',
      instructionVideoEmbedUrl: '',
      instructions: '',
      estimatedDuration: '',
      isStarAssignment: false,
    });
    setSelectedFiles({
      scormFile: null,
      coverImage: null,
      videoFile: null,
      html5File: null,
      referenceAudio: null,
      audio: null,
      instructionVideo: null,
    });
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    if (instructionVideoPreviewUrl) URL.revokeObjectURL(instructionVideoPreviewUrl);
    setVideoPreviewUrl('');
    setCoverPreviewUrl('');
    setInstructionVideoPreviewUrl('');
  };

  const handleSubmit = async () => {
    try {
      const fd = new FormData();

      // common fields (FormData values should be strings for consistency)
      fd.append('title', formData.title ?? '');
      fd.append('description', formData.description || '');
      fd.append('isPublished', formData.isPublished === true || formData.isPublished === 'true' ? 'true' : 'false');

      if (formData.tags?.length) {
        fd.append('tags', JSON.stringify(formData.tags));
      }

      if (contentType === CONTENT_TYPES.ACTIVITY) {
        if (!selectedFiles.scormFile) {
          alert('Please upload a SCORM file (ZIP) for the activity.');
          return;
        }
        fd.append('starsAwarded', formData.starsAwarded || 15);
        fd.append('scormFile', selectedFiles.scormFile);
        if (selectedFiles.coverImage) {
          fd.append('coverImage', selectedFiles.coverImage);
        }
      }

      if (contentType === CONTENT_TYPES.BOOK) {
        const bookPackageType =
          formData.packageType === BOOK_PACKAGE_TYPES.BUILTIN
            ? BOOK_PACKAGE_TYPES.BUILTIN
            : BOOK_PACKAGE_TYPES.HTML5;
        if (bookPackageType !== BOOK_PACKAGE_TYPES.BUILTIN && !selectedFiles.scormFile) {
          alert('Please upload an HTML5 package ZIP for the book.');
          return;
        }
        if (bookPackageType === BOOK_PACKAGE_TYPES.BUILTIN && !formData.cmsBookId) {
          alert('Please select a built-in book from the right drawer.');
          return;
        }
        fd.append('packageType', bookPackageType);
        fd.append('language', formData.language || 'en');
        fd.append('readingLevel', formData.readingLevel || 'beginner');
        if (formData.estimatedReadingTime != null && formData.estimatedReadingTime !== '') {
          fd.append('estimatedReadingTime', String(formData.estimatedReadingTime));
        }
        fd.append('requiredReadingCount', String(formData.requiredReadingCount ?? 5));
        fd.append('totalStarsAwarded', String(formData.totalStarsAwarded ?? 50));
        if (bookPackageType === BOOK_PACKAGE_TYPES.BUILTIN) {
          fd.append('cmsBookId', formData.cmsBookId);
        } else {
          fd.append('scormFile', selectedFiles.scormFile);
        }
        if (selectedFiles.coverImage) {
          fd.append('coverImage', selectedFiles.coverImage);
        }
      }

      if (contentType === CONTENT_TYPES.VIDEO) {
        const isEmbed = formData.videoSource === 'embed';
        if (isEmbed) {
          if (!formData.embedUrl?.trim()) {
            alert('Please paste the Bunny iframe embed URL.');
            return;
          }
          if (!looksLikeBunnyExploreEmbedUrl(formData.embedUrl)) {
            alert(
              'Embed URL must be HTTPS and look like:\nhttps://iframe.mediadelivery.net/embed/...'
            );
            return;
          }
          fd.append('videoSource', 'embed');
          fd.append('embedUrl', formData.embedUrl.trim());
        } else {
          if (!selectedFiles.videoFile) {
            alert('Please upload a video file.');
            return;
          }
          fd.append('videoSource', 'upload');
          fd.append('videoFile', selectedFiles.videoFile);
        }
        if (formData.videoCompletionType === VIDEO_COMPLETION_TYPES.HTML5) {
          if (!selectedFiles.html5File) {
            alert('Please upload an HTML5 package ZIP for the video follow-up.');
            return;
          }
          fd.append('completionContentType', VIDEO_COMPLETION_TYPES.HTML5);
          fd.append('html5File', selectedFiles.html5File);
        } else if (formData.videoCompletionType === VIDEO_COMPLETION_TYPES.BUILTIN) {
          if (!formData.cmsBookId) {
            alert('Please select a built-in CMS book for the video follow-up.');
            return;
          }
          fd.append('completionContentType', VIDEO_COMPLETION_TYPES.BUILTIN);
          fd.append('cmsBookId', formData.cmsBookId);
        } else {
          fd.append('completionContentType', VIDEO_COMPLETION_TYPES.NONE);
        }
        if (formData.duration !== '' && formData.duration != null) {
          fd.append('duration', String(formData.duration));
        }
        fd.append('starsAwarded', formData.starsAwarded || 10);
        if (selectedFiles.coverImage) {
          fd.append('coverImage', selectedFiles.coverImage);
        }
      }

      if (contentType === CONTENT_TYPES.AUDIO_ASSIGNMENT) {
        if (!formData.instructions.trim()) {
          alert('Please provide instructions for the audio assignment.');
          return;
        }
        fd.append('instructions', formData.instructions.trim());
        if (formData.estimatedDuration) {
          fd.append('estimatedDuration', formData.estimatedDuration);
        }
        fd.append('starsAwarded', formData.starsAwarded || 10);
        fd.append('isStarAssignment', formData.isStarAssignment);
        if (selectedFiles.referenceAudio) {
          fd.append('referenceAudio', selectedFiles.referenceAudio);
        }
        if (!appendInstructionVideoToFormData(fd)) return;
        if (selectedFiles.coverImage) {
          fd.append('coverImage', selectedFiles.coverImage);
        }
      }

      if (contentType === CONTENT_TYPES.CHANT) {
        // Instructions are optional for chants
        if (formData.instructions) {
          fd.append('instructions', formData.instructions.trim());
        }
        if (formData.estimatedDuration) {
          fd.append('estimatedDuration', formData.estimatedDuration);
        }
        fd.append('starsAwarded', formData.starsAwarded || 10);
        // Optional audio file
        if (selectedFiles.audio) {
          fd.append('audio', selectedFiles.audio);
        }
        if (!appendInstructionVideoToFormData(fd)) return;
        if (selectedFiles.coverImage) {
          fd.append('coverImage', selectedFiles.coverImage);
        }
      }

      const result = await createNewContent(contentType, fd);
      resetState();
      // Pass created content data to onSuccess callback
      if (onSuccess) {
        onSuccess(result?.data || null, contentType);
      }
    } catch (error) {
      console.error('Error creating content:', error);
      // useContent hook already shows notification; ensure user sees message (e.g. network/server errors)
      const message = typeof error === 'string' ? error : error?.message;
      if (message) alert(message);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

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

  const renderVideoBentoFields = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} lg={8}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={bentoTitleSx}>Main video</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Upload a video file or paste a Bunny iframe link.
              </Typography>
            </Box>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                row
                value={formData.videoSource}
                onChange={(e) => {
                  const v = e.target.value;
                  handleInputChange('videoSource', v);
                  if (v === 'embed') {
                    setSelectedFiles((prev) => ({ ...prev, videoFile: null, scormFile: null }));
                  } else {
                    handleInputChange('embedUrl', '');
                  }
                }}
                aria-label="How to add the main video for this content"
              >
                <FormControlLabel
                  value="upload"
                  control={<Radio />}
                  label={(
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CloudUploadIcon fontSize="small" aria-hidden />
                      <span>Upload file</span>
                    </Stack>
                  )}
                />
                <FormControlLabel
                  value="embed"
                  control={<Radio />}
                  label={(
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <InsertLinkIcon fontSize="small" aria-hidden />
                      <span>Bunny embed</span>
                    </Stack>
                  )}
                />
              </RadioGroup>
            </FormControl>

            {formData.videoSource === 'upload' ? (
              <Box>
                <input
                  accept="video/*"
                  style={{ display: 'none' }}
                  id="video-upload-bento"
                  type="file"
                  aria-label="Select video file to upload"
                  onChange={(e) => handleFileChange('videoFile', e.target.files)}
                />
                <Box
                  component="label"
                  htmlFor="video-upload-bento"
                  role="button"
                  tabIndex={0}
                  aria-label={selectedFiles.videoFile ? 'Change selected video file' : 'Upload video file'}
                  sx={{
                    width: '100%',
                    aspectRatio: '1.618 / 1',
                    minHeight: { xs: 220, md: 340 },
                    borderRadius: '18px',
                    border: selectedFiles.videoFile
                      ? `1px solid ${theme.palette.divider}`
                      : `2px dashed ${theme.palette.divider}`,
                    overflow: 'hidden',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                        : 'linear-gradient(145deg, #fffaf0, #f8fafc)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: '160ms ease',
                    '&:hover': {
                      borderColor: theme.palette.orange?.main || theme.palette.primary.main,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  {videoPreviewUrl ? (
                    <>
                      <Box
                        component="video"
                        src={videoPreviewUrl}
                        muted
                        controls
                        playsInline
                        sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: '#000' }}
                      />
                      <Chip
                        label="Change video"
                        size="small"
                        sx={{ position: 'absolute', top: 12, right: 12, fontFamily: 'Quicksand, sans-serif' }}
                      />
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={1.25} sx={{ px: 3, textAlign: 'center' }}>
                      <CloudUploadIcon sx={{ fontSize: 56, color: theme.palette.text.secondary }} aria-hidden />
                      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                        Upload video file
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                        Best for 16:9, 16:10, or golden-ratio rectangular videos.
                      </Typography>
                    </Stack>
                  )}
                </Box>
                {selectedFiles.videoFile && (
                  <Chip
                    label={selectedFiles.videoFile.name}
                    size="small"
                    sx={{ mt: 1 }}
                    onDelete={() => handleFileChange('videoFile', null)}
                  />
                )}
              </Box>
            ) : (
              <Box>
                <TextField
                  value={formData.embedUrl}
                  onChange={(e) => handleInputChange('embedUrl', e.target.value)}
                  placeholder="https://iframe.mediadelivery.net/embed/..."
                  fullWidth
                  multiline
                  minRows={2}
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
                    mt: 1.5,
                    width: '100%',
                    aspectRatio: '1.618 / 1',
                    minHeight: { xs: 220, md: 340 },
                    borderRadius: '18px',
                    border: `1px solid ${theme.palette.divider}`,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  role="region"
                  aria-label="Bunny embed preview"
                >
                  {looksLikeBunnyExploreEmbedUrl(formData.embedUrl) ? (
                    <Box
                      component="iframe"
                      title="Bunny embed preview"
                      src={formData.embedUrl.trim()}
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                      sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, textAlign: 'center', fontFamily: 'Quicksand, sans-serif' }}>
                      Enter a valid Bunny embed URL to preview the player.
                    </Typography>
                  )}
                </Box>
              </Box>
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
                  Leave this empty when the video should end normally.
                </Typography>
              </Box>

              <RadioGroup
                value={formData.videoCompletionType}
                onChange={(e) => {
                  const selectedType = e.target.value;
                  handleInputChange('videoCompletionType', selectedType);
                  if (selectedType !== VIDEO_COMPLETION_TYPES.BUILTIN) {
                    handleInputChange('cmsBookId', '');
                    handleInputChange('selectedCmsBook', null);
                  }
                  if (selectedType !== VIDEO_COMPLETION_TYPES.HTML5) {
                    setSelectedFiles((prev) => ({ ...prev, html5File: null }));
                  }
                }}
                aria-label="Choose optional activity shown after the video finishes"
              >
                <FormControlLabel value={VIDEO_COMPLETION_TYPES.NONE} control={<Radio />} label="No follow-up activity" />
                <FormControlLabel value={VIDEO_COMPLETION_TYPES.HTML5} control={<Radio />} label="HTML5 package" />
                <FormControlLabel value={VIDEO_COMPLETION_TYPES.BUILTIN} control={<Radio />} label="Built-in CMS book" />
              </RadioGroup>

              {formData.videoCompletionType === VIDEO_COMPLETION_TYPES.HTML5 && (
                <Box>
                  <input
                    accept=".zip,application/zip,application/x-zip-compressed"
                    style={{ display: 'none' }}
                    id="video-html5-upload-bento"
                    type="file"
                    aria-label="Select HTML5 ZIP follow-up for video"
                    onChange={(e) => handleFileChange('html5File', e.target.files)}
                  />
                  <label htmlFor="video-html5-upload-bento">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                    >
                      Upload HTML5 package (ZIP)
                    </Button>
                  </label>
                  {selectedFiles.html5File && (
                    <Chip
                      label={selectedFiles.html5File.name}
                      size="small"
                      sx={{ mt: 1 }}
                      onDelete={() => setSelectedFiles((prev) => ({ ...prev, html5File: null }))}
                    />
                  )}
                </Box>
              )}

              {formData.videoCompletionType === VIDEO_COMPLETION_TYPES.BUILTIN && (
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
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
                inputProps={{ min: 0 }}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
              />
              <TextField
                label="Stars Awarded"
                type="number"
                value={formData.starsAwarded}
                onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value, 10) || 0)}
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
                  sx={{
                    borderRadius: '10px',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  <MenuItem value="false">Draft</MenuItem>
                  <MenuItem value="true">Published</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Paper>
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <Stack spacing={1.5}>
            <Box>
              <Typography sx={bentoTitleSx}>Cover image</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Optional thumbnail for the video card.
              </Typography>
            </Box>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="video-cover-upload-bento"
              type="file"
              aria-label="Select video cover image"
              onChange={(e) => handleFileChange('coverImage', e.target.files)}
            />
            <Box
              component="label"
              htmlFor="video-cover-upload-bento"
              role="button"
              tabIndex={0}
              aria-label={selectedFiles.coverImage ? 'Change selected cover image' : 'Upload video cover image'}
              sx={{
                width: '100%',
                ...(coverPreviewUrl
                  ? {
                      borderRadius: 0,
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.grey[100],
                    }
                  : {
                      aspectRatio: '1.618 / 1',
                      minHeight: { xs: 170, md: 260 },
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
                '&:hover': {
                  borderColor: theme.palette.orange?.main || theme.palette.primary.main,
                },
              }}
            >
              {coverPreviewUrl ? (
                <>
                  <Box
                    component="img"
                    src={coverPreviewUrl}
                    alt="Selected video cover preview"
                    sx={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain',
                    }}
                  />
                  <Chip
                    label="Change cover"
                    size="small"
                    sx={{ position: 'absolute', top: 12, right: 12, fontFamily: 'Quicksand, sans-serif' }}
                  />
                </>
              ) : (
                <Stack alignItems="center" spacing={1} sx={{ px: 3, textAlign: 'center' }}>
                  <CloudUploadIcon sx={{ fontSize: 42, color: theme.palette.text.secondary }} aria-hidden />
                  <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                    Upload cover image
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Rectangular thumbnails fit best in course cards.
                  </Typography>
                </Stack>
              )}
            </Box>
            {selectedFiles.coverImage && (
              <Chip
                label={selectedFiles.coverImage.name}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
                onDelete={() => handleFileChange('coverImage', null)}
              />
            )}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const appendInstructionVideoToFormData = (fd) => {
    if (formData.instructionVideoSource === 'embed') {
      const embed = formData.instructionVideoEmbedUrl?.trim();
      if (!embed) return true;
      if (!looksLikeBunnyExploreEmbedUrl(embed)) {
        alert('Please enter a valid Bunny iframe embed URL for the instruction video.');
        return false;
      }
      fd.append('instructionVideoSource', 'embed');
      fd.append('instructionVideoEmbedUrl', embed);
      return true;
    }
    if (selectedFiles.instructionVideo) {
      fd.append('instructionVideoSource', 'upload');
      fd.append('instructionVideo', selectedFiles.instructionVideo);
    }
    return true;
  };

  const renderAudioBentoFields = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} lg={8}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <BentoInstructionVideoField
            theme={theme}
            idPrefix="audio"
            videoSource={formData.instructionVideoSource}
            embedUrl={formData.instructionVideoEmbedUrl}
            onSourceChange={(value) => {
              handleInputChange('instructionVideoSource', value);
              if (value === 'embed') {
                handleFileChange('instructionVideo', null);
              } else {
                handleInputChange('instructionVideoEmbedUrl', '');
              }
            }}
            onEmbedUrlChange={(value) => handleInputChange('instructionVideoEmbedUrl', value)}
            selectedFile={selectedFiles.instructionVideo}
            filePreviewUrl={instructionVideoPreviewUrl}
            onFileSelect={(e) => handleFileChange('instructionVideo', e.target.files)}
            onClearFile={() => handleFileChange('instructionVideo', null)}
          />
        </Paper>
      </Grid>
      <Grid item xs={12} lg={4}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={bentoCardSx}>
            <Stack spacing={1.5}>
              <Typography sx={bentoTitleSx}>Rewards & timing</Typography>
              <TextField
                label="Estimated Duration (minutes)"
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value, 10) || 0)}
                inputProps={{ min: 0 }}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
              />
              <TextField
                label="Stars Awarded"
                type="number"
                value={formData.starsAwarded}
                onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value, 10) || 0)}
                inputProps={{ min: 0 }}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
              />
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={formData.isStarAssignment}
                    onChange={(e) => handleInputChange('isStarAssignment', e.target.checked)}
                    color="primary"
                  />
                )}
                label="Star assignment (high-value task)"
                sx={{ '& .MuiTypography-root': { fontFamily: 'Quicksand, sans-serif' } }}
              />
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={bentoCardSx}>
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
          </Paper>
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <Stack spacing={1.5}>
            <Typography sx={bentoTitleSx}>Reference audio</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              Optional sample audio for learners.
            </Typography>
            <input
              accept="audio/*"
              style={{ display: 'none' }}
              id="audio-ref-upload-bento"
              type="file"
              onChange={(e) => handleFileChange('referenceAudio', e.target.files)}
            />
            <label htmlFor="audio-ref-upload-bento">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
              >
                Upload reference audio
              </Button>
            </label>
            {selectedFiles.referenceAudio && (
              <Chip
                label={selectedFiles.referenceAudio.name}
                size="small"
                onDelete={() => handleFileChange('referenceAudio', null)}
              />
            )}
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <BentoCoverImageField
            theme={theme}
            id="audio-cover-upload-bento"
            previewUrl={coverPreviewUrl}
            fileName={selectedFiles.coverImage?.name}
            onFileChange={(e) => handleFileChange('coverImage', e.target.files)}
            onClearFile={() => handleFileChange('coverImage', null)}
          />
        </Paper>
      </Grid>
    </Grid>
  );

  const renderChantBentoFields = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} lg={8}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <BentoInstructionVideoField
            theme={theme}
            idPrefix="chant"
            videoSource={formData.instructionVideoSource}
            embedUrl={formData.instructionVideoEmbedUrl}
            onSourceChange={(value) => {
              handleInputChange('instructionVideoSource', value);
              if (value === 'embed') {
                handleFileChange('instructionVideo', null);
              } else {
                handleInputChange('instructionVideoEmbedUrl', '');
              }
            }}
            onEmbedUrlChange={(value) => handleInputChange('instructionVideoEmbedUrl', value)}
            selectedFile={selectedFiles.instructionVideo}
            filePreviewUrl={instructionVideoPreviewUrl}
            onFileSelect={(e) => handleFileChange('instructionVideo', e.target.files)}
            onClearFile={() => handleFileChange('instructionVideo', null)}
          />
        </Paper>
      </Grid>
      <Grid item xs={12} lg={4}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={bentoCardSx}>
            <Stack spacing={1.5}>
              <Typography sx={bentoTitleSx}>Rewards & timing</Typography>
              <TextField
                label="Estimated Duration (minutes)"
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value, 10) || 0)}
                inputProps={{ min: 0 }}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
              />
              <TextField
                label="Stars Awarded"
                type="number"
                value={formData.starsAwarded}
                onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value, 10) || 0)}
                inputProps={{ min: 0 }}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
              />
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={bentoCardSx}>
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
          </Paper>
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <Stack spacing={1.5}>
            <Typography sx={bentoTitleSx}>Chant audio</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              Optional audio file for the chant.
            </Typography>
            <input
              accept="audio/*"
              style={{ display: 'none' }}
              id="chant-audio-upload-bento"
              type="file"
              onChange={(e) => handleFileChange('audio', e.target.files)}
            />
            <label htmlFor="chant-audio-upload-bento">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
              >
                Upload audio file
              </Button>
            </label>
            {selectedFiles.audio && (
              <Chip label={selectedFiles.audio.name} size="small" onDelete={() => handleFileChange('audio', null)} />
            )}
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <BentoCoverImageField
            theme={theme}
            id="chant-cover-upload-bento"
            previewUrl={coverPreviewUrl}
            fileName={selectedFiles.coverImage?.name}
            onFileChange={(e) => handleFileChange('coverImage', e.target.files)}
            onClearFile={() => handleFileChange('coverImage', null)}
          />
        </Paper>
      </Grid>
    </Grid>
  );

  const renderBookBentoFields = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} lg={7}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={bentoTitleSx}>Book package</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Upload an HTML5 (Captivate) ZIP or link a published built-in CMS book.
              </Typography>
            </Box>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                row
                value={formData.packageType}
                onChange={(e) => {
                  const selectedType = e.target.value;
                  handleInputChange('packageType', selectedType);
                  if (selectedType !== BOOK_PACKAGE_TYPES.BUILTIN) {
                    handleInputChange('cmsBookId', '');
                    handleInputChange('selectedCmsBook', null);
                  }
                  if (selectedType === BOOK_PACKAGE_TYPES.BUILTIN) {
                    setSelectedFiles((prev) => ({ ...prev, scormFile: null }));
                  }
                }}
                aria-label="Book package type"
              >
                <FormControlLabel
                  value={BOOK_PACKAGE_TYPES.HTML5}
                  control={<Radio />}
                  label={(
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CloudUploadIcon fontSize="small" aria-hidden />
                      <span>HTML5 (Captivate)</span>
                    </Stack>
                  )}
                />
                <FormControlLabel
                  value={BOOK_PACKAGE_TYPES.BUILTIN}
                  control={<Radio />}
                  label={(
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <InsertLinkIcon fontSize="small" aria-hidden />
                      <span>Built-in CMS book</span>
                    </Stack>
                  )}
                />
              </RadioGroup>
            </FormControl>

            {formData.packageType === BOOK_PACKAGE_TYPES.BUILTIN ? (
              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '14px',
                  p: 2,
                  backgroundColor: theme.palette.background.default,
                }}
              >
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 0.5 }}>
                  Built-in book source
                </Typography>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, mb: 1.5 }}>
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
            ) : (
              <>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}>
                    HTML5 package (ZIP) <Typography component="span" color="error.main">*</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                    Click the box to pick your Captivate HTML5 export ZIP.
                  </Typography>
                </Box>
                <input
                  accept=".zip,application/zip,application/x-zip-compressed"
                  style={{ display: 'none' }}
                  id="book-html5-upload-bento"
                  type="file"
                  aria-label="Select HTML5 package ZIP for book"
                  onChange={(e) => handleFileChange('scormFile', e.target.files)}
                />
                <Box
                  component="label"
                  htmlFor="book-html5-upload-bento"
                  role="button"
                  tabIndex={0}
                  aria-label={selectedFiles.scormFile ? 'Change HTML5 package ZIP' : 'Upload HTML5 package ZIP'}
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    minHeight: { xs: 200, md: 280 },
                    borderRadius: '14px',
                    border: selectedFiles.scormFile
                      ? `1px solid ${theme.palette.divider}`
                      : `2px dashed ${theme.palette.divider}`,
                    overflow: 'hidden',
                    backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: '160ms ease',
                    '&:hover': {
                      borderColor: theme.palette.orange?.main || theme.palette.primary.main,
                    },
                  }}
                >
                  {selectedFiles.scormFile ? (
                    <>
                      <Stack alignItems="center" spacing={1} sx={{ px: 3, textAlign: 'center' }}>
                        <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.text.secondary }} aria-hidden />
                        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                          {selectedFiles.scormFile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                          {(selectedFiles.scormFile.size / (1024 * 1024)).toFixed(2)} MB
                        </Typography>
                      </Stack>
                      <Chip
                        label="Change package"
                        size="small"
                        sx={{ position: 'absolute', top: 12, right: 12, fontFamily: 'Quicksand, sans-serif' }}
                      />
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={1.25} sx={{ px: 3, textAlign: 'center' }}>
                      <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.text.secondary }} aria-hidden />
                      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                        Upload HTML5 package
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                        ZIP export from Captivate or compatible HTML5 authoring tool.
                      </Typography>
                    </Stack>
                  )}
                </Box>
                {selectedFiles.scormFile && (
                  <Chip
                    label={selectedFiles.scormFile.name}
                    size="small"
                    sx={{ alignSelf: 'flex-start' }}
                    onDelete={() => handleFileChange('scormFile', null)}
                  />
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Paper variant="outlined" sx={bentoCardSx}>
            <Stack spacing={1.5}>
              <Typography sx={bentoTitleSx}>Reading settings</Typography>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={formData.language}
                  label="Language"
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Reading Level</InputLabel>
                <Select
                  value={formData.readingLevel}
                  label="Reading Level"
                  onChange={(e) => handleInputChange('readingLevel', e.target.value)}
                  sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Estimated reading time (min)"
                type="number"
                value={formData.estimatedReadingTime}
                onChange={(e) => handleInputChange('estimatedReadingTime', e.target.value)}
                inputProps={{ min: 0 }}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
              />
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="Required readings"
                  type="number"
                  value={formData.requiredReadingCount}
                  onChange={(e) => handleInputChange('requiredReadingCount', parseInt(e.target.value, 10) || 1)}
                  inputProps={{ min: 1 }}
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                />
                <TextField
                  label="Total stars"
                  type="number"
                  value={formData.totalStarsAwarded}
                  onChange={(e) => handleInputChange('totalStarsAwarded', parseInt(e.target.value, 10) || 0)}
                  inputProps={{ min: 0 }}
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                />
              </Stack>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={bentoCardSx}>
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
          </Paper>
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <Paper variant="outlined" sx={bentoCardSx}>
          <BentoCoverImageField
            theme={theme}
            id="book-cover-upload-bento"
            previewUrl={coverPreviewUrl}
            fileName={selectedFiles.coverImage?.name}
            onFileChange={(e) => handleFileChange('coverImage', e.target.files)}
            onClearFile={() => handleFileChange('coverImage', null)}
            title="Cover image"
            description="Optional thumbnail displayed on the book card."
          />
        </Paper>
      </Grid>
    </Grid>
  );

  const renderTypeSpecificFields = () => {
    switch (contentType) {
      case CONTENT_TYPES.BOOK:
        return null;
      case CONTENT_TYPES.VIDEO:
        return (
          <>
            <FormControl component="fieldset" fullWidth>
              <FormLabel
                component="legend"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  marginBottom: 1,
                }}
              >
                Main video
              </FormLabel>
              <RadioGroup
                row
                value={formData.videoSource}
                onChange={(e) => {
                  const v = e.target.value;
                  handleInputChange('videoSource', v);
                  if (v === 'embed') {
                    setSelectedFiles((prev) => ({ ...prev, videoFile: null, scormFile: null }));
                  } else {
                    handleInputChange('embedUrl', '');
                  }
                }}
                aria-label="How to add the main video for this content"
              >
                <FormControlLabel
                  value="upload"
                  control={<Radio />}
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CloudUploadIcon fontSize="small" aria-hidden />
                      <span>Upload file</span>
                    </Stack>
                  }
                />
                <FormControlLabel
                  value="embed"
                  control={<Radio />}
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <InsertLinkIcon fontSize="small" aria-hidden />
                      <span>Bunny embed (iframe)</span>
                    </Stack>
                  }
                />
              </RadioGroup>
              <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', display: 'block', mt: 0.5 }}>
                Bunny embed uses iframe.mediadelivery.net.
              </Typography>
            </FormControl>
            <FormControl component="fieldset" fullWidth>
              <FormLabel
                component="legend"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  marginBottom: 1,
                }}
              >
                After video finishes (optional)
              </FormLabel>
              <RadioGroup
                row
                value={formData.videoCompletionType}
                onChange={(e) => {
                  const selectedType = e.target.value;
                  handleInputChange('videoCompletionType', selectedType);
                  if (selectedType !== VIDEO_COMPLETION_TYPES.BUILTIN) {
                    handleInputChange('cmsBookId', '');
                    handleInputChange('selectedCmsBook', null);
                  }
                  if (selectedType !== VIDEO_COMPLETION_TYPES.HTML5) {
                    setSelectedFiles((prev) => ({ ...prev, html5File: null }));
                  }
                }}
                aria-label="Choose the content shown after the video finishes"
              >
                <FormControlLabel value={VIDEO_COMPLETION_TYPES.NONE} control={<Radio />} label="No follow-up activity" />
                <FormControlLabel value={VIDEO_COMPLETION_TYPES.HTML5} control={<Radio />} label="HTML5 package" />
                <FormControlLabel value={VIDEO_COMPLETION_TYPES.BUILTIN} control={<Radio />} label="Built-in CMS book" />
              </RadioGroup>
              <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', display: 'block', mt: 0.5 }}>
                Leave this as No follow-up activity when the video should end normally.
              </Typography>
            </FormControl>
            {formData.videoCompletionType === VIDEO_COMPLETION_TYPES.BUILTIN && (
              <Box
                sx={{
                  border: `1px solid ${theme.palette.border.main}`,
                  borderRadius: '10px',
                  p: 1.5,
                }}
              >
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 0.5 }}>
                  Built-in follow-up book
                </Typography>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, mb: 1 }}>
                  {formData.selectedCmsBook?.title || 'No built-in book selected'}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setCmsBooksDrawerOpen(true)}
                  sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                >
                  {formData.cmsBookId ? 'Change built-in book' : 'Select built-in book'}
                </Button>
              </Box>
            )}
            <TextField
              label="Duration (seconds)"
              type="number"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
              inputProps={{ min: 0 }}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
            <TextField
              label="Stars Awarded"
              type="number"
              value={formData.starsAwarded}
              onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value, 10) || 0)}
              inputProps={{ min: 0 }}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
          </>
        );
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return (
          <TextField
            label="Instructions"
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            multiline
            rows={3}
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />
        );
      case CONTENT_TYPES.CHANT:
        return (
          <TextField
            label="Instructions (Optional)"
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
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
        );
      case CONTENT_TYPES.ACTIVITY:
      default:
        return (
          <TextField
            label="Stars Awarded"
            type="number"
            value={formData.starsAwarded}
            onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value) || 0)}
            inputProps={{ min: 0 }}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />
        );
    }
  };

  const renderFileInputs = () => {
    return (
      <>
        {/* Files based on content type */}
        {contentType === CONTENT_TYPES.ACTIVITY && (
          <>
            {/* SCORM File (required) */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  marginBottom: 1,
                }}
              >
                SCORM File <span style={{ color: 'red' }}>*</span>
              </Typography>
              <input
                accept=".zip,application/zip,application/x-zip-compressed"
                style={{ display: 'none' }}
                id="content-scorm-upload"
                type="file"
                onChange={(e) => handleFileChange('scormFile', e.target.files)}
              />
              <label htmlFor="content-scorm-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                  sx={{
                    borderRadius: '10px',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  Upload SCORM File (ZIP)
                </Button>
              </label>
              {selectedFiles.scormFile && (
                <Box sx={{ marginTop: 1 }}>
                  <Chip
                    label={selectedFiles.scormFile.name}
                    size="small"
                    sx={{ margin: 0.5 }}
                    onDelete={() => setSelectedFiles((prev) => ({ ...prev, scormFile: null }))}
                  />
                </Box>
              )}
            </Box>
          </>
        )}

        {contentType === CONTENT_TYPES.BOOK && null}

        {contentType === CONTENT_TYPES.VIDEO && (
          <>
            {formData.videoSource === 'upload' ? (
              <>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      marginBottom: 1,
                    }}
                  >
                    Video file <span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <input
                    accept="video/*"
                    style={{ display: 'none' }}
                    id="video-upload"
                    type="file"
                    aria-label="Select video file to upload"
                    onChange={(e) => handleFileChange('videoFile', e.target.files)}
                  />
                  <label htmlFor="video-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      sx={{
                        borderRadius: '10px',
                        fontFamily: 'Quicksand, sans-serif',
                      }}
                    >
                      Upload video
                    </Button>
                  </label>
                  {selectedFiles.videoFile && (
                    <Box sx={{ marginTop: 1 }}>
                      <Chip
                        label={selectedFiles.videoFile.name}
                        size="small"
                        sx={{ margin: 0.5 }}
                        onDelete={() => setSelectedFiles((prev) => ({ ...prev, videoFile: null }))}
                      />
                    </Box>
                  )}
                </Box>

              </>
            ) : (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    marginBottom: 1,
                  }}
                >
                  Bunny iframe URL <span style={{ color: 'red' }}>*</span>
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', display: 'block', mb: 1 }}>
                  Paste the embed URL from Bunny (https://iframe.mediadelivery.net/embed/…).
                </Typography>
                <TextField
                  value={formData.embedUrl}
                  onChange={(e) => handleInputChange('embedUrl', e.target.value)}
                  placeholder="https://iframe.mediadelivery.net/embed/…"
                  fullWidth
                  multiline
                  minRows={2}
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
                    mt: 1.5,
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: '10px',
                    border: `1px solid ${theme.palette.divider}`,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  role="region"
                  aria-label="Bunny embed preview"
                >
                  {looksLikeBunnyExploreEmbedUrl(formData.embedUrl) ? (
                    <Box
                      component="iframe"
                      title="Bunny embed preview"
                      src={formData.embedUrl.trim()}
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
                      Enter a valid embed URL to preview the player
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            {formData.videoCompletionType === VIDEO_COMPLETION_TYPES.HTML5 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    marginBottom: 1,
                  }}
                >
                  HTML5 follow-up package <span style={{ color: 'red' }}>*</span>
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', display: 'block', mb: 1 }}>
                  Required only when HTML5 package is selected as the optional follow-up activity.
                </Typography>
                <input
                  accept=".zip,application/zip,application/x-zip-compressed"
                  style={{ display: 'none' }}
                  id="video-html5-upload"
                  type="file"
                  aria-label="Select HTML5 ZIP follow-up for video"
                  onChange={(e) => handleFileChange('html5File', e.target.files)}
                />
                <label htmlFor="video-html5-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    sx={{
                      borderRadius: '10px',
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  >
                    Upload HTML5 package (ZIP)
                  </Button>
                </label>
                {selectedFiles.html5File && (
                  <Box sx={{ marginTop: 1 }}>
                    <Chip
                      label={selectedFiles.html5File.name}
                      size="small"
                      sx={{ margin: 0.5 }}
                      onDelete={() => setSelectedFiles((prev) => ({ ...prev, html5File: null }))}
                    />
                  </Box>
                )}
              </Box>
            )}
          </>
        )}

        {/* Cover image shared by activity/book types (optional) */}
        {contentType !== CONTENT_TYPES.VIDEO
          && contentType !== CONTENT_TYPES.AUDIO_ASSIGNMENT
          && contentType !== CONTENT_TYPES.CHANT
          && contentType !== CONTENT_TYPES.BOOK && (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              marginBottom: 1,
            }}
          >
            Cover Image (Optional)
          </Typography>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="content-cover-upload"
            type="file"
            onChange={(e) => handleFileChange('coverImage', e.target.files)}
          />
          <label htmlFor="content-cover-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              Upload Cover Image
            </Button>
          </label>
          {selectedFiles.coverImage && (
            <Box sx={{ marginTop: 1 }}>
              <Chip
                label={selectedFiles.coverImage.name}
                size="small"
                sx={{ margin: 0.5 }}
                onDelete={() => setSelectedFiles((prev) => ({ ...prev, coverImage: null }))}
              />
            </Box>
          )}
        </Box>
        )}
      </>
    );
  };

  const getDialogTitle = () => {
    switch (contentType) {
      case CONTENT_TYPES.BOOK:
        return 'Create New Book';
      case CONTENT_TYPES.VIDEO:
        return 'Create New Video';
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return 'Create New Audio Assignment';
      case CONTENT_TYPES.CHANT:
        return 'Create New Chant';
      case CONTENT_TYPES.ACTIVITY:
      default:
        return 'Create New Activity';
    }
  };

  // Form content (reusable in both Dialog and Drawer)
  const formContent = (
    <>
      <Stack spacing={3} sx={{ marginTop: renderAsDrawer ? 0 : '20px', padding: renderAsDrawer ? 3 : 0 }}>
        {/* Content Type Selector */}
        <FormControl fullWidth>
          <InputLabel>Content Type</InputLabel>
          <Select
            value={contentType}
            label="Content Type"
            onChange={(e) => {
              const nextType = e.target.value;
              const prevType = contentType;
              setContentType(nextType);
              if (nextType === CONTENT_TYPES.BOOK) {
                handleInputChange('packageType', BOOK_DEFAULT_PACKAGE_TYPE);
              }
              if (nextType === CONTENT_TYPES.VIDEO) {
                handleInputChange('videoSource', 'upload');
                handleInputChange('embedUrl', '');
                handleInputChange('videoCompletionType', VIDEO_COMPLETION_TYPES.NONE);
                setSelectedFiles((prev) => ({ ...prev, videoFile: null, scormFile: null, html5File: null }));
              } else if (prevType === CONTENT_TYPES.VIDEO) {
                handleInputChange('videoSource', 'upload');
                handleInputChange('embedUrl', '');
                handleInputChange('videoCompletionType', VIDEO_COMPLETION_TYPES.NONE);
                setSelectedFiles((prev) => ({ ...prev, videoFile: null, scormFile: null, html5File: null }));
              }
            }}
            sx={{
              borderRadius: '10px',
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            <MenuItem value={CONTENT_TYPES.ACTIVITY}>Activity (SCORM)</MenuItem>
            <MenuItem value={CONTENT_TYPES.BOOK}>Book (HTML5 / Built-in CMS)</MenuItem>
            <MenuItem value={CONTENT_TYPES.VIDEO}>Video (upload or Bunny embed)</MenuItem>
            <MenuItem value={CONTENT_TYPES.AUDIO_ASSIGNMENT}>Audio Assignment</MenuItem>
            <MenuItem value={CONTENT_TYPES.CHANT}>Chant (Optional Audio & Video)</MenuItem>
          </Select>
        </FormControl>

        {/* Title */}
        <TextField
          label="Title"
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

        {contentType === CONTENT_TYPES.VIDEO ? (
          renderVideoBentoFields()
        ) : contentType === CONTENT_TYPES.AUDIO_ASSIGNMENT ? (
          <>
            {renderTypeSpecificFields()}
            {renderAudioBentoFields()}
          </>
        ) : contentType === CONTENT_TYPES.CHANT ? (
          <>
            {renderTypeSpecificFields()}
            {renderChantBentoFields()}
          </>
        ) : contentType === CONTENT_TYPES.BOOK ? (
          renderBookBentoFields()
        ) : (
          <>
            {/* Type-specific numeric / logical fields */}
            {renderTypeSpecificFields()}

            {/* File inputs based on type + cover image */}
            {renderFileInputs()}
          </>
        )}

        {contentType !== CONTENT_TYPES.VIDEO
          && contentType !== CONTENT_TYPES.AUDIO_ASSIGNMENT
          && contentType !== CONTENT_TYPES.CHANT
          && contentType !== CONTENT_TYPES.BOOK && (
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.isPublished ? 'true' : 'false'}
              onChange={(e) => handleInputChange('isPublished', e.target.value === 'true')}
              label="Status"
              sx={{
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              <MenuItem value="false">Draft</MenuItem>
              <MenuItem value="true">Published</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>

      {/* Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          padding: 3,
          borderTop: renderAsDrawer ? `1px solid ${theme.palette.border.main}` : 'none',
          marginTop: renderAsDrawer ? 2 : 0,
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
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </Box>
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

  // If rendering as drawer, return just the form content
  if (renderAsDrawer) {
    return formContent;
  }

  // Otherwise, render as Dialog
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={
        contentType === CONTENT_TYPES.VIDEO
        || contentType === CONTENT_TYPES.AUDIO_ASSIGNMENT
        || contentType === CONTENT_TYPES.CHANT
          ? 'lg'
          : 'md'
      }
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '16px',
          fontFamily: 'Quicksand, sans-serif',
          ...(contentType === CONTENT_TYPES.VIDEO
            || contentType === CONTENT_TYPES.AUDIO_ASSIGNMENT
            || contentType === CONTENT_TYPES.CHANT
            ? { width: 'min(1280px, calc(100vw - 32px))' }
            : {}),
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
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.5rem',
          }}
        >
          {getDialogTitle()}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default ContentAddModal;


