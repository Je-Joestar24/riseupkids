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
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useExplore } from '../../../../hooks/exploreHook';

/**
 * ExploreAddModal Component
 *
 * Modal for creating new explore content
 * Always creates video type content
 * Supports videoType: replay or activity (purely video lesson)
 * For activity type: supports activityIcon (SVG)
 * Detects current filter type and pre-selects it
 */
const ExploreAddModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const { createNewExploreContent, loading, prepareExploreFormData, filters } = useExplore();

  // Get videoType from URL params or filters, default to 'activity' (purely video)
  const getInitialVideoType = () => {
    const urlVideoType = searchParams.get('videoType');
    const filterVideoType = filters?.videoType;
    return urlVideoType || filterVideoType || 'activity';
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'video', // Always video
    videoType: getInitialVideoType(),
    starsAwarded: 10,
    duration: '',
    isFeatured: false,
    isPublished: false,
  });

  const [selectedFiles, setSelectedFiles] = useState({
    videoFile: null,
    coverImage: null,
    activityIcon: null,
  });

  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [activityIconPreviewUrl, setActivityIconPreviewUrl] = useState(null);

  // Reset state when modal closes and update videoType when filters/URL change
  useEffect(() => {
    if (!open) {
      resetState();
    } else {
      // Update videoType when modal opens based on current filters/URL
      const currentVideoType = getInitialVideoType();
      setFormData((prev) => ({ ...prev, videoType: currentVideoType }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchParams, filters?.videoType]);

  const resetState = () => {
    setFormData({
      title: '',
      description: '',
      type: 'video', // Always video
      videoType: 'activity', // Default to 'activity' (purely video)
      starsAwarded: 10,
      duration: '',
      isFeatured: false,
      isPublished: false,
    });
    setSelectedFiles({
      videoFile: null,
      coverImage: null,
      activityIcon: null,
    });
    setImagePreviewUrl(null);
    setActivityIconPreviewUrl(null);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    setSelectedFiles((prev) => ({ ...prev, [field]: file }));
    
    // Create preview URLs
    if (file) {
      if (field === 'coverImage') {
        const url = URL.createObjectURL(file);
        setImagePreviewUrl(url);
      } else if (field === 'activityIcon') {
        const url = URL.createObjectURL(file);
        setActivityIconPreviewUrl(url);
      }
    } else {
      if (field === 'coverImage') {
        setImagePreviewUrl(null);
      } else if (field === 'activityIcon') {
        setActivityIconPreviewUrl(null);
      }
    }
  };

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (activityIconPreviewUrl) {
        URL.revokeObjectURL(activityIconPreviewUrl);
      }
    };
  }, [imagePreviewUrl, activityIconPreviewUrl]);


  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.title.trim()) {
        alert('Please provide a title');
        return;
      }

      // Video file is required
      if (!selectedFiles.videoFile) {
        alert('Please upload a video file');
        return;
      }

      // Prepare FormData
      const formDataToSend = prepareExploreFormData(
        formData,
        selectedFiles.videoFile,
        selectedFiles.coverImage,
        selectedFiles.activityIcon
      );

      await createNewExploreContent(formDataToSend);
      
      if (onSuccess) {
        onSuccess();
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

  const renderTypeSpecificFields = () => {
    return (
      <>
          <TextField
            label="Duration (seconds)"
            type="number"
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', e.target.value)}
            inputProps={{ min: 0 }}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />
          {formData.videoType === 'activity' && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  marginBottom: 1,
                }}
              >
                Activity Icon (SVG) <span style={{ color: theme.palette.text.secondary }}>(Optional)</span>
              </Typography>
              <input
                accept=".svg,image/svg+xml"
                style={{ display: 'none' }}
                id="activity-icon-upload"
                type="file"
                onChange={(e) => handleFileChange('activityIcon', e.target.files)}
              />
              <label htmlFor="activity-icon-upload">
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
                  Upload Activity Icon (SVG)
                </Button>
              </label>
              {selectedFiles.activityIcon && (
                <Box sx={{ marginTop: 1 }}>
                  <Chip
                    label={selectedFiles.activityIcon.name}
                    size="small"
                    sx={{ margin: 0.5 }}
                    onDelete={() => setSelectedFiles((prev) => ({ ...prev, activityIcon: null }))}
                  />
                </Box>
              )}
              {activityIconPreviewUrl && (
                <Box sx={{ marginTop: 1 }}>
                  <img
                    src={activityIconPreviewUrl}
                    alt="Activity Icon Preview"
                    style={{
                      maxWidth: '100px',
                      maxHeight: '100px',
                      borderRadius: '8px',
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '20px',
          fontFamily: 'Quicksand, sans-serif',
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
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.custom.bgTertiary,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3, marginTop: '10px' }}>
        <Stack spacing={3} sx={{marginTop: '20px'}}>
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

          {/* Video Type */}
          <FormControl fullWidth>
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
              <MenuItem value="replay">Replay</MenuItem>
              <MenuItem value="activity">Purely Video Lesson</MenuItem>
            </Select>
          </FormControl>

          {/* Video-specific fields */}
          {renderTypeSpecificFields()}

          {/* Stars Awarded */}
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

          {/* File Uploads */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                marginBottom: 1,
              }}
            >
              Video File <span style={{ color: 'red' }}>*</span>
            </Typography>
              <input
                accept="video/*"
                style={{ display: 'none' }}
                id="video-file-upload"
                type="file"
                onChange={(e) => handleFileChange('videoFile', e.target.files)}
              />
              <label htmlFor="video-file-upload">
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
                  Upload Video File
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

          {/* Cover Image (only for replay type, not for purely video) */}
          {formData.videoType === 'replay' && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  marginBottom: 1,
                }}
              >
                Cover Image <span style={{ color: theme.palette.text.secondary }}>(Optional)</span>
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="cover-image-upload"
                type="file"
                onChange={(e) => handleFileChange('coverImage', e.target.files)}
              />
              <label htmlFor="cover-image-upload">
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
              {imagePreviewUrl && (
                <Box sx={{ marginTop: 1 }}>
                  <img
                    src={imagePreviewUrl}
                    alt="Cover Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Checkboxes */}
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isPublished}
                  onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                  color="primary"
                />
              }
              label="Published"
              sx={{
                '& .MuiTypography-root': {
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isFeatured}
                  onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                  color="primary"
                />
              }
              label="Featured"
              sx={{
                '& .MuiTypography-root': {
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `2px solid ${theme.palette.border.main}`,
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
          disabled={loading}
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
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExploreAddModal;
