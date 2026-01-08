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
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import useCourse from '../../../../hooks/courseHook';
import ContentSelector from './ContentSelector';
import CourseSelectedContentArea from './CourseSelectedContentArea';
import ContentReorderModal from './ContentReorderModal';

/**
 * CourseAddModal Component
 *
 * Modal for creating/editing course/content collection
 * Includes form fields, cover image upload, and content selection
 * Supports both create and edit modes
 * 
 * @param {Boolean} open - Modal open state
 * @param {Function} onClose - Close handler
 * @param {Function} onSuccess - Success callback
 * @param {String} mode - 'create' | 'edit' (default: 'create')
 * @param {String} courseId - Course ID for edit mode (optional if course prop provided)
 * @param {Object} course - Course object for edit mode (optional, will fetch if courseId provided)
 * @param {Number} contentCreatedTrigger - External trigger for content creation refresh
 * @param {Object} createdContentData - Created content data to auto-add
 * @param {Function} onCreatedContentProcessed - Callback when created content is processed
 */
const CourseAddModal = ({ 
  open, 
  onClose, 
  onSuccess, 
  mode = 'create',
  courseId = null,
  course: initialCourse = null,
  contentCreatedTrigger: externalContentCreatedTrigger, 
  createdContentData, 
  onCreatedContentProcessed 
}) => {
  const theme = useTheme();
  const { createNewCourse, updateCourseData, fetchCourse, prepareCourseFormData, loading, openDrawer, getCoverImageUrl } = useCourse();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublished: false,
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState(null); // For edit mode - existing cover image
  const [selectedContents, setSelectedContents] = useState([]);
  const [isFetchingCourse, setIsFetchingCourse] = useState(false);
  const [courseData, setCourseData] = useState(null);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  
  // Use external trigger if provided, otherwise use internal state
  const [internalContentCreatedTrigger, setInternalContentCreatedTrigger] = useState(0);
  const contentCreatedTrigger = externalContentCreatedTrigger !== undefined 
    ? externalContentCreatedTrigger 
    : internalContentCreatedTrigger;

  const isEditMode = mode === 'edit';

  // Fetch course data for edit mode
  useEffect(() => {
    if (open && isEditMode && courseId && !courseData && !isFetchingCourse) {
      const loadCourseData = async () => {
        setIsFetchingCourse(true);
        try {
          const result = await fetchCourse(courseId);
          if (result?.data) {
            const course = result.data;
            setCourseData(course);
            
            // Pre-populate form
            setFormData({
              title: course.title || '',
              description: course.description || '',
              isPublished: course.isPublished || false,
              tags: course.tags || [],
            });
            
            // Set existing cover image
            if (course.coverImage) {
              const coverUrl = getCoverImageUrl(course.coverImage);
              setCurrentCoverImageUrl(coverUrl);
            }
            
            // Pre-select existing contents
            if (course.contents && Array.isArray(course.contents)) {
              const formattedContents = course.contents.map((content) => ({
                contentId: content._id || content.contentId,
                contentType: content._contentType || content.contentType,
                // Preserve step and order from backend (_step, _order) or use defaults
                step: content._step !== undefined ? content._step : (content.step !== undefined ? content.step : 1),
                order: content._order !== undefined ? content._order : (content.order !== undefined ? content.order : 0),
                // Include full item data for display
                ...content,
                _id: content._id || content.contentId,
                _contentType: content._contentType || content.contentType,
              }));
              setSelectedContents(formattedContents);
            }
          }
        } catch (error) {
          console.error('Error fetching course:', error);
        } finally {
          setIsFetchingCourse(false);
        }
      };
      
      loadCourseData();
    } else if (open && isEditMode && initialCourse && !courseData) {
      // Use provided course data directly
      setCourseData(initialCourse);
      setFormData({
        title: initialCourse.title || '',
        description: initialCourse.description || '',
        isPublished: initialCourse.isPublished || false,
        tags: initialCourse.tags || [],
      });
      
      if (initialCourse.coverImage) {
        const coverUrl = getCoverImageUrl(initialCourse.coverImage);
        setCurrentCoverImageUrl(coverUrl);
      }
      
      if (initialCourse.contents && Array.isArray(initialCourse.contents)) {
        const formattedContents = initialCourse.contents.map((content) => ({
          contentId: content._id || content.contentId,
          contentType: content._contentType || content.contentType,
          // Preserve step and order from backend (_step, _order) or use defaults
          step: content._step !== undefined ? content._step : (content.step !== undefined ? content.step : 1),
          order: content._order !== undefined ? content._order : (content.order !== undefined ? content.order : 0),
          ...content,
          _id: content._id || content.contentId,
          _contentType: content._contentType || content.contentType,
        }));
        setSelectedContents(formattedContents);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditMode, courseId]);

  // Reset form when modal closes
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
      setCurrentCoverImageUrl(null);
      setSelectedContents([]);
      setCourseData(null);
      setIsFetchingCourse(false);
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
        // Calculate order: count existing contents of same type in Step 1
        const existingOfType = selectedContents.filter(
          (c) => 
            (c.contentType || c._contentType) === backendContentType && 
            (c.step || c._step || 1) === 1
        );
        
        // Add to selected contents with auto-assigned step and order
        const newContentItem = {
          contentId: content._id,
          contentType: backendContentType,
          step: 1, // Default step
          order: existingOfType.length, // Next order number
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
      // Clear current cover image URL when new image is selected
      setCurrentCoverImageUrl(null);
    }
  };

  const handleRemoveCoverImage = () => {
    setSelectedCoverImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setCurrentCoverImageUrl(null);
  };

  const handleContentSelectionChange = (contents) => {
    // Contents should include full item data (contentId, contentType, and item details)
    // Auto-assign step and order values for new contents
    const updatedContents = contents.map((item) => {
      // If item already has step and order, preserve them
      if (item.step !== undefined && item.order !== undefined) {
        return item;
      }
      
      // Auto-assign step: 1 (default)
      const step = item.step || item._step || 1;
      const contentType = item.contentType || item._contentType;
      
      // Calculate order: count existing contents of same type in the same step
      const existingOfType = contents.filter(
        (c) => 
          (c.contentId || c._id) !== (item.contentId || item._id) && // Not the current item
          (c.contentType || c._contentType) === contentType &&
          (c.step || c._step || 1) === step
      );
      
      return {
        ...item,
        step: step,
        order: existingOfType.length, // Next order number
      };
    });
    
    setSelectedContents(updatedContents);
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

  const handleReorderClick = () => {
    setReorderModalOpen(true);
  };

  const handleReorderModalClose = () => {
    setReorderModalOpen(false);
  };

  const handleReorderSave = (reorderedContents) => {
    // Update selectedContents with reordered contents
    // Update order values to be sequential within each step and type
    const groupedByStepAndType = {};
    
    reorderedContents.forEach((item) => {
      const step = item.step || item._step || 1;
      const contentType = item.contentType || item._contentType;
      const key = `${step}-${contentType}`;
      
      if (!groupedByStepAndType[key]) {
        groupedByStepAndType[key] = [];
      }
      groupedByStepAndType[key].push(item);
    });
    
    // Update order values sequentially within each group
    const updatedContents = [];
    Object.keys(groupedByStepAndType).sort().forEach((key) => {
      const items = groupedByStepAndType[key];
      items.forEach((item, index) => {
        updatedContents.push({
          ...item,
          order: index,
          step: item.step || item._step || 1,
        });
      });
    });
    
    setSelectedContents(updatedContents);
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
      const courseDataToSubmit = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        isPublished: formData.isPublished,
        tags: formData.tags,
        contents: selectedContents, // Array of { contentId, contentType }
      };

      // Prepare FormData
      const formDataToSend = prepareCourseFormData(courseDataToSubmit, selectedCoverImage);

      if (isEditMode && courseId) {
        // Update course
        await updateCourseData(courseId, formDataToSend);
      } else {
        // Create course
        await createNewCourse(formDataToSend);
      }

      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} course:`, error);
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
          {isEditMode ? 'Edit Course' : 'Create New Course'}
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
        {isFetchingCourse ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
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

            {/* Show preview of new image if selected, otherwise show current cover image */}
            {(imagePreviewUrl || currentCoverImageUrl) && (
              <Box
                component="img"
                src={imagePreviewUrl || currentCoverImageUrl}
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
                {selectedCoverImage || currentCoverImageUrl ? 'Change Cover Image' : 'Upload Cover Image'}
              </Button>
            </label>
            {(selectedCoverImage || currentCoverImageUrl) && (
              <Box sx={{ marginTop: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedCoverImage && (
                  <Chip
                    label={selectedCoverImage.name}
                    size="small"
                    onDelete={handleRemoveCoverImage}
                    sx={{ fontFamily: 'Quicksand, sans-serif' }}
                  />
                )}
                {currentCoverImageUrl && !selectedCoverImage && (
                  <Chip
                    label="Current cover image"
                    size="small"
                    onDelete={handleRemoveCoverImage}
                    sx={{ fontFamily: 'Quicksand, sans-serif' }}
                  />
                )}
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
                onReorder={handleReorderClick}
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
        )}
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
          disabled={loading || isFetchingCourse || !formData.title}
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
          {loading 
            ? (isEditMode ? 'Updating...' : 'Creating...') 
            : (isEditMode ? 'Update Course' : 'Create Course')}
        </Button>
      </DialogActions>

      {/* Content Reorder Modal */}
      <ContentReorderModal
        open={reorderModalOpen}
        onClose={handleReorderModalClose}
        contents={selectedContents}
        onSave={handleReorderSave}
        courseId={isEditMode ? courseId : null}
      />
    </Dialog>
  );
};

export default CourseAddModal;
