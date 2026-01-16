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
  Chip,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useExplore } from '../../../../hooks/exploreHook';
import { getVideoTypeOptions } from '../../../../constants/exploreVideoTypes';

/**
 * ExploreEditModal Component
 *
 * Modal for editing explore content (always video type)
 * Can edit: title, description, videoType (replay/activity), starsAwarded,
 * isFeatured, isPublished, duration, coverImage (replay only), activityIcon (activity only)
 * Note: Video file cannot be changed after creation
 */
const ExploreEditModal = ({ open, onClose, contentId, onSuccess }) => {
  const theme = useTheme();
  const {
    fetchContent,
    updateExploreContentData,
    loading,
    currentExploreContent,
    clearContent,
    getCoverImageUrl,
    prepareExploreFormData,
  } = useExplore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoType: 'replay',
    starsAwarded: 10,
    duration: '',
    isFeatured: false,
    isPublished: false,
  });
  const [selectedFiles, setSelectedFiles] = useState({
    coverImage: null,
  });

  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  // Fetch content data when modal opens
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
      clearContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentId]);

  // Update form data when currentExploreContent changes
  useEffect(() => {
    if (open && contentId && currentExploreContent && currentExploreContent._id === contentId && !isInitialized) {
      setFormData({
        title: currentExploreContent.title || '',
        description: currentExploreContent.description || '',
        videoType: currentExploreContent.videoType || 'replay',
        starsAwarded: currentExploreContent.starsAwarded || 10,
        duration: currentExploreContent.duration || '',
        isFeatured: currentExploreContent.isFeatured || false,
        isPublished: currentExploreContent.isPublished || false,
      });
      
      // Set existing cover image URL (for all video types)
      if (currentExploreContent.coverImage) {
        const coverUrl = getCoverImageUrl(currentExploreContent.coverImage);
        setCurrentCoverImageUrl(coverUrl);
      } else {
        setCurrentCoverImageUrl(null);
      }
      
      setSelectedFiles({
        coverImage: null,
      });
      setImagePreviewUrl(null);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentId, currentExploreContent?._id]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    setSelectedFiles((prev) => ({ ...prev, [field]: file }));
    
    // Create preview URLs
    if (file && field === 'coverImage') {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    } else if (field === 'coverImage') {
      setImagePreviewUrl(null);
    }
  };

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);


  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.title.trim()) {
        alert('Title cannot be empty');
        return;
      }

      // Prepare FormData (no videoFile for edit)
      const formDataToSend = prepareExploreFormData(
        formData,
        null, // videoFile cannot be changed
        selectedFiles.coverImage
      );

      await updateExploreContentData(contentId, formDataToSend);
      
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error updating explore content:', error);
    }
  };

  const handleClose = () => {
    setIsInitialized(false);
    setImagePreviewUrl(null);
    setCurrentCoverImageUrl(null);
    onClose();
  };

  if (!currentExploreContent && open && contentId) {
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
        <DialogContent sx={{ padding: 3, textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
            }}
          >
            Loading content...
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

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
          Edit Explore Content
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
              {getVideoTypeOptions().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Duration */}
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

          {/* Cover Photo (for all video types) */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                marginBottom: 1,
              }}
            >
              Cover Photo <span style={{ color: theme.palette.text.secondary }}>(Optional)</span>
            </Typography>
            {currentCoverImageUrl && !selectedFiles.coverImage && (
              <Box sx={{ marginBottom: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: theme.palette.text.secondary,
                    display: 'block',
                    marginBottom: 1,
                  }}
                >
                  Current Cover Image:
                </Typography>
                <img
                  src={currentCoverImageUrl}
                  alt="Current Cover"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                  }}
                />
              </Box>
            )}
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="cover-image-upload-edit"
              type="file"
              onChange={(e) => handleFileChange('coverImage', e.target.files)}
            />
            <label htmlFor="cover-image-upload-edit">
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
                {currentCoverImageUrl ? 'Change Cover Photo' : 'Upload Cover Photo'}
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
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: theme.palette.text.secondary,
                    display: 'block',
                    marginBottom: 1,
                  }}
                >
                  New Cover Photo Preview:
                </Typography>
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
          {loading ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExploreEditModal;
