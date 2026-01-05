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
import useActivity from '../../../../hooks/activityHook';

/**
 * ActivityEditModal Component
 * 
 * Modal for editing activities
 * Can only edit: title, description, coverImage, starsAwarded, isPublished
 */
const ActivityEditModal = ({ open, onClose, activityId, onSuccess }) => {
  const theme = useTheme();
  const { fetchActivity, updateActivityData, loading, currentActivity, clearActivity } = useActivity();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    starsAwarded: 15,
    isPublished: false,
  });

  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [currentCoverImage, setCurrentCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  // Fetch activity data when modal opens
  useEffect(() => {
    if (open && activityId) {
      // Check if we already have the correct activity loaded
      const hasCorrectActivity = currentActivity && currentActivity._id === activityId;
      const isDifferentActivity = lastFetchedIdRef.current !== activityId;
      
      // Only fetch if:
      // 1. We don't have the correct activity loaded
      // 2. We're not already fetching
      // 3. This is a different activity than we last fetched
      if (!hasCorrectActivity && !isFetchingRef.current && isDifferentActivity) {
        isFetchingRef.current = true;
        lastFetchedIdRef.current = activityId;
        fetchActivity(activityId)
          .catch(() => {
            // Reset on error so we can retry
            lastFetchedIdRef.current = null;
          })
          .finally(() => {
            isFetchingRef.current = false;
          });
      }
    } else if (!open) {
      // Reset when modal closes
      setIsInitialized(false);
      isFetchingRef.current = false;
      lastFetchedIdRef.current = null;
      clearActivity();
    }
    // Only depend on open and activityId - currentActivity is checked inside
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activityId]);

  // Update form data when currentActivity changes (only once when it first loads)
  useEffect(() => {
    if (open && activityId && currentActivity && currentActivity._id === activityId && !isInitialized) {
      setFormData({
        title: currentActivity.title || '',
        description: currentActivity.description || '',
        starsAwarded: currentActivity.starsAwarded || 15,
        isPublished: currentActivity.isPublished || false,
      });
      setCurrentCoverImage(currentActivity.coverImage);
      setSelectedCoverImage(null);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activityId, currentActivity?._id]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverImageChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedCoverImage(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  // Cleanup object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleSubmit = async () => {
    try {
      // Create FormData
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('starsAwarded', formData.starsAwarded);
      formDataToSend.append('isPublished', formData.isPublished);

      // Add cover image if a new one is selected
      if (selectedCoverImage) {
        formDataToSend.append('coverImage', selectedCoverImage);
      }

      await updateActivityData(activityId, formDataToSend);
      
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      starsAwarded: 15,
      isPublished: false,
    });
    setSelectedCoverImage(null);
    setCurrentCoverImage(null);
    setIsInitialized(false);
    isFetchingRef.current = false;
    // Cleanup preview URL
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
          Edit Activity
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3} sx={{ marginTop: '20px' }}>
          {/* Title */}
          <TextField
            label="Activity Title"
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
            
            {/* Current or New Cover Image Preview */}
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
              id="cover-image-upload-edit"
              type="file"
              onChange={handleCoverImageChange}
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
          {loading ? 'Updating...' : 'Update Activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivityEditModal;

