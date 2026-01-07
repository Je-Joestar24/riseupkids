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
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import useCourse from '../../../../hooks/courseHook';
import ContentSelector from './ContentSelector';
import CourseSelectedContentArea from './CourseSelectedContentArea';

/**
 * CourseAddModal Component
 *
 * Modal for creating new course/content collection
 * Includes form fields, cover image upload, and content selection
 */
const CourseAddModal = ({ open, onClose, onSuccess, contentCreatedTrigger: externalContentCreatedTrigger, createdContentData, onCreatedContentProcessed }) => {
  const theme = useTheme();
  const { createNewCourse, prepareCourseFormData, loading, openDrawer } = useCourse();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublished: false,
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [selectedContents, setSelectedContents] = useState([]);
  
  // Use external trigger if provided, otherwise use internal state
  const [internalContentCreatedTrigger, setInternalContentCreatedTrigger] = useState(0);
  const contentCreatedTrigger = externalContentCreatedTrigger !== undefined 
    ? externalContentCreatedTrigger 
    : internalContentCreatedTrigger;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        isPublished: false,
        tags: [],
      });
      setTagInput('');
      setSelectedCoverImage(null);
      setImagePreviewUrl(null);
      setSelectedContents([]);
      // Don't reset external trigger, only internal one
      if (externalContentCreatedTrigger === undefined) {
        setInternalContentCreatedTrigger(0);
      }
    }
  }, [open, externalContentCreatedTrigger]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Automatically add created content to selected contents
  useEffect(() => {
    if (createdContentData && createdContentData.content) {
      const { content, contentType: createdContentType } = createdContentData;
      
      // Map content type to backend format
      // createdContentType should already be in backend format ('activity', 'book', etc.)
      // since CONTENT_TYPES constants use backend format values
      const backendContentType = createdContentType || 'activity';
      
      // Check if content is already selected
      const isAlreadySelected = selectedContents.some(
        (item) => item.contentId === content._id && item.contentType === backendContentType
      );

      if (!isAlreadySelected) {
        // Add to selected contents
        const newContentItem = {
          contentId: content._id,
          contentType: backendContentType,
          // Include full item data for display
          ...content,
          _id: content._id,
          _contentType: createdContentType,
        };

        setSelectedContents((prev) => [...prev, newContentItem]);
      }

      // Notify parent that we've processed the created content
      if (onCreatedContentProcessed) {
        onCreatedContentProcessed();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdContentData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTagInputKeyPress = (event) => {
    if (event.key === 'Enter' && tagInput.trim()) {
      event.preventDefault();
      const newTag = tagInput.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleCoverImageChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedCoverImage(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  const handleContentSelectionChange = (contents) => {
    // Contents should include full item data (contentId, contentType, and item details)
    setSelectedContents(contents);
  };

  const handleRemoveContent = (contentId, contentType) => {
    // Remove content from selectedContents
    setSelectedContents((prev) =>
      prev.filter(
        (item) =>
          !(item.contentId === contentId && item.contentType === contentType)
      )
    );
  };

  const handleCreateContentClick = (contentType) => {
    // Open drawer via Redux (managed at page level)
    if (openDrawer) {
      openDrawer(contentType);
    }
  };

  const handleContentCreated = () => {
    // Trigger refresh in ContentSelector when content is created
    // Only update internal trigger if external one is not provided
    if (externalContentCreatedTrigger === undefined) {
      setInternalContentCreatedTrigger((prev) => prev + 1);
    }
    // External trigger is managed by parent (AdminCourses)
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.title || !formData.title.trim()) {
        alert('Please provide a course title');
        return;
      }

      // Prepare course data
      const courseData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        isPublished: formData.isPublished,
        tags: formData.tags,
        contents: selectedContents, // Array of { contentId, contentType }
      };

      // Prepare FormData
      const formDataToSend = prepareCourseFormData(courseData, selectedCoverImage);

      // Create course
      await createNewCourse(formDataToSend);

      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error creating course:', error);
      // Error notification is handled by the hook
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      isPublished: false,
      tags: [],
    });
    setTagInput('');
    setSelectedCoverImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setSelectedContents([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '16px',
          fontFamily: 'Quicksand, sans-serif',
          maxHeight: '90vh',
          backgroundColor: 'white',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
          Create New Course
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          padding: 3,
          overflowY: 'auto',
        }}
      >
        <Stack spacing={3}>
          {/* Basic Information Section */}
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                marginBottom: 2,
                color: theme.palette.text.primary,
              }}
            >
              Basic Information
            </Typography>

            <Stack spacing={2.5}>
              {/* Title */}
              <TextField
                label="Course Title"
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

              {/* Tags */}
              <Box>
                <TextField
                  label="Tags"
                  placeholder="Press Enter to add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontFamily: 'Quicksand, sans-serif',
                    },
                  }}
                />
                {formData.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginTop: 1.5 }}>
                    {formData.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Published Status */}
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
          </Box>

          <Divider />

          {/* Cover Image Section */}
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                marginBottom: 2,
                color: theme.palette.text.primary,
              }}
            >
              Cover Image (Optional)
            </Typography>

            {imagePreviewUrl && (
              <Box
                component="img"
                src={imagePreviewUrl}
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
              id="course-cover-image-upload"
              type="file"
              onChange={handleCoverImageChange}
            />
            <label htmlFor="course-cover-image-upload">
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
                {selectedCoverImage ? 'Change Cover Image' : 'Upload Cover Image'}
              </Button>
            </label>
            {selectedCoverImage && (
              <Box sx={{ marginTop: 1 }}>
                <Chip
                  label={selectedCoverImage.name}
                  size="small"
                  sx={{ margin: 0.5 }}
                  onDelete={() => {
                    setSelectedCoverImage(null);
                    if (imagePreviewUrl) {
                      URL.revokeObjectURL(imagePreviewUrl);
                      setImagePreviewUrl(null);
                    }
                  }}
                />
              </Box>
            )}
          </Box>

          <Divider />

          {/* Content Selection Section */}
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                marginBottom: 2,
                color: theme.palette.text.primary,
              }}
            >
              Add Content (Optional)
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                marginBottom: 2,
              }}
            >
              Select existing content items to include in this course. You can add Activities, Books, Videos, and Audio Assignments.
            </Typography>

            {/* Selected Contents Area - Display above selector */}
            {selectedContents.length > 0 && (
              <CourseSelectedContentArea
                selectedContents={selectedContents}
                onRemove={handleRemoveContent}
              />
            )}

            <ContentSelector
              selectedContents={selectedContents}
              onSelectionChange={handleContentSelectionChange}
              onCreateContentClick={handleCreateContentClick}
              onContentCreated={contentCreatedTrigger} // Trigger refresh when content is created
            />
          </Box>
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
          {loading ? 'Creating...' : 'Create Course'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourseAddModal;
