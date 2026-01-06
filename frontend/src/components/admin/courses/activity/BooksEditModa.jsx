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
 * BookEditModal Component
 * 
 * Modal for editing books
 * Can only edit: title, description, coverImage, language, readingLevel,
 * estimatedReadingTime, requiredReadingCount, starsPerReading, totalStarsAwarded, isPublished
 * SCORM file cannot be changed
 */
const BookEditModal = ({ open, onClose, bookId, onSuccess }) => {
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
    language: 'en',
    readingLevel: 'beginner',
    estimatedReadingTime: null,
    requiredReadingCount: 5,
    starsPerReading: 10,
    totalStarsAwarded: 50,
    isPublished: false,
  });

  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [currentCoverImage, setCurrentCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  // Fetch book data when modal opens
  useEffect(() => {
    if (open && bookId) {
      const hasCorrectBook = currentContent && currentContent._id === bookId;
      const isDifferentBook = lastFetchedIdRef.current !== bookId;
      
      if (!hasCorrectBook && !isFetchingRef.current && isDifferentBook) {
        isFetchingRef.current = true;
        lastFetchedIdRef.current = bookId;
        fetchContent(CONTENT_TYPES.BOOK, bookId)
          .catch((error) => {
            console.error('Error fetching book:', error);
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
  }, [open, bookId]);

  // Update form data when currentContent changes
  useEffect(() => {
    if (open && bookId && currentContent && currentContent._id === bookId && !isInitialized) {
      setFormData({
        title: currentContent.title || '',
        description: currentContent.description || '',
        language: currentContent.language || 'en',
        readingLevel: currentContent.readingLevel || 'beginner',
        estimatedReadingTime: currentContent.estimatedReadingTime || null,
        requiredReadingCount: currentContent.requiredReadingCount || 5,
        starsPerReading: currentContent.starsPerReading || 10,
        totalStarsAwarded: currentContent.totalStarsAwarded || 50,
        isPublished: currentContent.isPublished || false,
      });
      setCurrentCoverImage(currentContent.coverImage);
      setSelectedCoverImage(null);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookId, currentContent?._id]);

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
      formDataToSend.append('language', formData.language);
      formDataToSend.append('readingLevel', formData.readingLevel);
      if (formData.estimatedReadingTime) {
        formDataToSend.append('estimatedReadingTime', formData.estimatedReadingTime);
      }
      formDataToSend.append('requiredReadingCount', formData.requiredReadingCount);
      formDataToSend.append('starsPerReading', formData.starsPerReading);
      formDataToSend.append('totalStarsAwarded', formData.totalStarsAwarded);
      formDataToSend.append('isPublished', formData.isPublished);

      if (selectedCoverImage) {
        formDataToSend.append('coverImage', selectedCoverImage);
      }

      await updateContentData(CONTENT_TYPES.BOOK, bookId, formDataToSend);
      
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      language: 'en',
      readingLevel: 'beginner',
      estimatedReadingTime: null,
      requiredReadingCount: 5,
      starsPerReading: 10,
      totalStarsAwarded: 50,
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
          Edit Book
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3} sx={{ marginTop: '20px' }}>
          {/* Title */}
          <TextField
            label="Book Title"
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

          {/* Language */}
          <FormControl fullWidth>
            <InputLabel>Language</InputLabel>
            <Select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              label="Language"
              sx={{
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
            </Select>
          </FormControl>

          {/* Reading Level */}
          <FormControl fullWidth>
            <InputLabel>Reading Level</InputLabel>
            <Select
              value={formData.readingLevel}
              onChange={(e) => handleInputChange('readingLevel', e.target.value)}
              label="Reading Level"
              sx={{
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
          </FormControl>

          {/* Estimated Reading Time */}
          <TextField
            label="Estimated Reading Time (minutes)"
            type="number"
            value={formData.estimatedReadingTime || ''}
            onChange={(e) => handleInputChange('estimatedReadingTime', parseInt(e.target.value) || null)}
            inputProps={{ min: 0 }}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />

          {/* Required Reading Count */}
          <TextField
            label="Required Reading Count"
            type="number"
            value={formData.requiredReadingCount}
            onChange={(e) => handleInputChange('requiredReadingCount', parseInt(e.target.value) || 1)}
            inputProps={{ min: 1 }}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />

          {/* Stars Per Reading */}
          <TextField
            label="Stars Per Reading"
            type="number"
            value={formData.starsPerReading}
            onChange={(e) => handleInputChange('starsPerReading', parseInt(e.target.value) || 0)}
            inputProps={{ min: 0 }}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />

          {/* Total Stars Awarded */}
          <TextField
            label="Total Stars Awarded (on completion)"
            type="number"
            value={formData.totalStarsAwarded}
            onChange={(e) => handleInputChange('totalStarsAwarded', parseInt(e.target.value) || 0)}
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
              id="book-cover-image-upload-edit"
              type="file"
              onChange={handleCoverImageChange}
            />
            <label htmlFor="book-cover-image-upload-edit">
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
          {loading ? 'Updating...' : 'Update Book'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookEditModal;

