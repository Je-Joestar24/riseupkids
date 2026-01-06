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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';

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
  });

  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [currentCoverImage, setCurrentCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
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
    });
    setSelectedCoverImage(null);
    setCurrentCoverImage(null);
    setIsInitialized(false);
    isFetchingRef.current = false;
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    onClose();
  };

  const displayCoverImage = selectedCoverImage && imagePreviewUrl
    ? imagePreviewUrl
    : currentCoverImage
    ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${currentCoverImage}`
    : null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
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
          borderBottom: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
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

          {/* Duration */}
          <TextField
            label="Duration (seconds)"
            type="number"
            value={formData.duration || ''}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || null)}
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

          {/* Cover Image Upload */}
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
            
            {displayCoverImage && (
              <Box
                component="img"
                src={displayCoverImage}
                alt="Cover preview"
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: 2,
                }}
              />
            )}

            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="video-cover-image-upload-edit"
              type="file"
              onChange={handleCoverImageChange}
            />
            <label htmlFor="video-cover-image-upload-edit">
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
                {selectedCoverImage ? 'Change Cover Image' : 'Upload New Cover Image'}
              </Button>
            </label>
            {selectedCoverImage && (
              <Box sx={{ marginTop: 1 }}>
                <Chip
                  label={selectedCoverImage.name}
                  size="small"
                  sx={{ margin: 0.5 }}
                  onDelete={() => setSelectedCoverImage(null)}
                />
              </Box>
            )}
          </Box>

          {/* Published Toggle */}
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
  );
};

export default VideoEditModal;

