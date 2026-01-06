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
 * AudioEditModal Component
 * 
 * Modal for editing audio assignments
 * Can only edit: title, description, instructions, coverImage, estimatedDuration,
 * starsAwarded, isStarAssignment, isPublished
 * Reference audio cannot be changed
 */
const AudioEditModal = ({ open, onClose, audioId, onSuccess }) => {
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
    instructions: '',
    estimatedDuration: null,
    starsAwarded: 10,
    isStarAssignment: false,
    isPublished: false,
  });

  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [currentCoverImage, setCurrentCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  // Fetch audio assignment data when modal opens
  useEffect(() => {
    if (open && audioId) {
      const hasCorrectAudio = currentContent && currentContent._id === audioId;
      const isDifferentAudio = lastFetchedIdRef.current !== audioId;
      
      if (!hasCorrectAudio && !isFetchingRef.current && isDifferentAudio) {
        isFetchingRef.current = true;
        lastFetchedIdRef.current = audioId;
        fetchContent(CONTENT_TYPES.AUDIO_ASSIGNMENT, audioId)
          .catch((error) => {
            console.error('Error fetching audio assignment:', error);
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
  }, [open, audioId]);

  // Update form data when currentContent changes
  useEffect(() => {
    if (open && audioId && currentContent && currentContent._id === audioId && !isInitialized) {
      setFormData({
        title: currentContent.title || '',
        description: currentContent.description || '',
        instructions: currentContent.instructions || '',
        estimatedDuration: currentContent.estimatedDuration || null,
        starsAwarded: currentContent.starsAwarded || 10,
        isStarAssignment: currentContent.isStarAssignment || false,
        isPublished: currentContent.isPublished || false,
      });
      setCurrentCoverImage(currentContent.coverImage);
      setSelectedCoverImage(null);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audioId, currentContent?._id]);

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
      formDataToSend.append('instructions', formData.instructions);
      if (formData.estimatedDuration) {
        formDataToSend.append('estimatedDuration', formData.estimatedDuration);
      }
      formDataToSend.append('starsAwarded', formData.starsAwarded);
      formDataToSend.append('isStarAssignment', formData.isStarAssignment);
      formDataToSend.append('isPublished', formData.isPublished);

      if (selectedCoverImage) {
        formDataToSend.append('coverImage', selectedCoverImage);
      }

      await updateContentData(CONTENT_TYPES.AUDIO_ASSIGNMENT, audioId, formDataToSend);
      
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error updating audio assignment:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      instructions: '',
      estimatedDuration: null,
      starsAwarded: 10,
      isStarAssignment: false,
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
          Edit Audio Assignment
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3} sx={{ marginTop: '20px' }}>
          {/* Title */}
          <TextField
            label="Audio Assignment Title"
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

          {/* Instructions */}
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

          {/* Estimated Duration */}
          <TextField
            label="Estimated Duration (minutes)"
            type="number"
            value={formData.estimatedDuration || ''}
            onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || null)}
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

          {/* Is Star Assignment */}
          <FormControl fullWidth>
            <InputLabel>Is Star Assignment?</InputLabel>
            <Select
              value={formData.isStarAssignment ? 'true' : 'false'}
              onChange={(e) => handleInputChange('isStarAssignment', e.target.value === 'true')}
              label="Is Star Assignment?"
              sx={{
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              <MenuItem value="false">No</MenuItem>
              <MenuItem value="true">Yes</MenuItem>
            </Select>
          </FormControl>

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
              id="audio-cover-image-upload-edit"
              type="file"
              onChange={handleCoverImageChange}
            />
            <label htmlFor="audio-cover-image-upload-edit">
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
          disabled={loading || !formData.title || !formData.instructions}
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
          {loading ? 'Updating...' : 'Update Audio Assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AudioEditModal;

