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
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';

/**
 * ContentAddModal Component
 *
 * Unified modal for creating content items:
 * - Activity (SCORM)
 * - Book (SCORM + reading logic)
 * - Video (video + SCORM)
 * - Audio Assignment (reference audio)
 * 
 * Automatically detects current content type from filters/URL
 */
const ContentAddModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const { createNewContent, loading, filters } = useContent();

  // Initialize with current content type from filters
  const [contentType, setContentType] = useState(filters.contentType || CONTENT_TYPES.ACTIVITY);

  // Update content type when modal opens or filters change
  useEffect(() => {
    if (open) {
      // Set to current content type when modal opens
      const currentType = filters.contentType || CONTENT_TYPES.ACTIVITY;
      setContentType(currentType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filters.contentType]);

  const [formData, setFormData] = useState({
    // common
    title: '',
    description: '',
    isPublished: false,
    tags: [],
    starsAwarded: 15,
    // book-specific
    language: 'en',
    readingLevel: 'beginner',
    estimatedReadingTime: '',
    requiredReadingCount: 5,
    starsPerReading: 10,
    totalStarsAwarded: 50,
    // video-specific
    duration: '',
    // audio assignment-specific
    instructions: '',
    estimatedDuration: '',
    isStarAssignment: false,
  });

  const [selectedFiles, setSelectedFiles] = useState({
    scormFile: null,
    coverImage: null,
    videoFile: null,
    referenceAudio: null,
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, fileList) => {
    const file = fileList && fileList[0] ? fileList[0] : null;
    setSelectedFiles((prev) => ({ ...prev, [field]: file }));
  };

  const resetState = () => {
    // Reset to current content type (not always ACTIVITY)
    const currentType = filters.contentType || CONTENT_TYPES.ACTIVITY;
    setContentType(currentType);
    setFormData({
      title: '',
      description: '',
      isPublished: false,
      tags: [],
      starsAwarded: 15,
      language: 'en',
      readingLevel: 'beginner',
      estimatedReadingTime: '',
      requiredReadingCount: 5,
      starsPerReading: 10,
      totalStarsAwarded: 50,
      duration: '',
      instructions: '',
      estimatedDuration: '',
      isStarAssignment: false,
    });
    setSelectedFiles({
      scormFile: null,
      coverImage: null,
      videoFile: null,
      referenceAudio: null,
    });
  };

  const handleSubmit = async () => {
    try {
      const fd = new FormData();

      // common fields
      fd.append('title', formData.title);
      fd.append('description', formData.description || '');
      fd.append('isPublished', formData.isPublished);

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
        if (!selectedFiles.scormFile) {
          alert('Please upload a SCORM file (ZIP) for the book.');
          return;
        }
        fd.append('language', formData.language || 'en');
        fd.append('readingLevel', formData.readingLevel || 'beginner');
        if (formData.estimatedReadingTime) {
          fd.append('estimatedReadingTime', formData.estimatedReadingTime);
        }
        fd.append('requiredReadingCount', formData.requiredReadingCount || 5);
        fd.append('starsPerReading', formData.starsPerReading || 10);
        fd.append('totalStarsAwarded', formData.totalStarsAwarded || 50);
        fd.append('scormFile', selectedFiles.scormFile);
        if (selectedFiles.coverImage) {
          fd.append('coverImage', selectedFiles.coverImage);
        }
      }

      if (contentType === CONTENT_TYPES.VIDEO) {
        if (!selectedFiles.videoFile) {
          alert('Please upload a video file.');
          return;
        }
        // SCORM file is now optional for videos
        if (formData.duration) {
          fd.append('duration', formData.duration);
        }
        fd.append('starsAwarded', formData.starsAwarded || 10);
        fd.append('videoFile', selectedFiles.videoFile);
        if (selectedFiles.scormFile) {
          fd.append('scormFile', selectedFiles.scormFile);
        }
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
        if (selectedFiles.coverImage) {
          fd.append('coverImage', selectedFiles.coverImage);
        }
      }

      await createNewContent(contentType, fd);
      resetState();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating content:', error);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const renderTypeSpecificFields = () => {
    switch (contentType) {
      case CONTENT_TYPES.BOOK:
        return (
          <>
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                value={formData.language}
                label="Language"
                onChange={(e) => handleInputChange('language', e.target.value)}
                sx={{
                  borderRadius: '10px',
                  fontFamily: 'Quicksand, sans-serif',
                }}
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
            <TextField
              label="Estimated Reading Time (minutes)"
              type="number"
              value={formData.estimatedReadingTime}
              onChange={(e) => handleInputChange('estimatedReadingTime', e.target.value)}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
            <TextField
              label="Required Readings"
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
            <TextField
              label="Stars per Reading"
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
            <TextField
              label="Total Stars on Completion"
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
          </>
        );
      case CONTENT_TYPES.VIDEO:
        return (
          <>
            <TextField
              label="Duration (seconds)"
              type="number"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
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
          </>
        );
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return (
          <>
            <TextField
              label="Instructions"
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
            <TextField
              label="Estimated Duration (minutes)"
              type="number"
              value={formData.estimatedDuration}
              onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || 0)}
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isStarAssignment}
                  onChange={(e) => handleInputChange('isStarAssignment', e.target.checked)}
                  color="primary"
                />
              }
              label="Star Assignment (high-value task)"
              sx={{
                '& .MuiTypography-root': {
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
          </>
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

        {contentType === CONTENT_TYPES.BOOK && (
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
                Book SCORM File <span style={{ color: 'red' }}>*</span>
              </Typography>
              <input
                accept=".zip,application/zip,application/x-zip-compressed"
                style={{ display: 'none' }}
                id="book-scorm-upload"
                type="file"
                onChange={(e) => handleFileChange('scormFile', e.target.files)}
              />
              <label htmlFor="book-scorm-upload">
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
                  Upload Book SCORM File (ZIP)
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

        {contentType === CONTENT_TYPES.VIDEO && (
          <>
            {/* Video file (required) */}
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
                id="video-upload"
                type="file"
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
                  Upload Video
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

            {/* SCORM file for video (optional) */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  marginBottom: 1,
                }}
              >
                Video SCORM File (Optional)
              </Typography>
              <input
                accept=".zip,application/zip,application/x-zip-compressed"
                style={{ display: 'none' }}
                id="video-scorm-upload"
                type="file"
                onChange={(e) => handleFileChange('scormFile', e.target.files)}
              />
              <label htmlFor="video-scorm-upload">
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
                  Upload Video SCORM File (ZIP)
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

        {contentType === CONTENT_TYPES.AUDIO_ASSIGNMENT && (
          <>
            {/* Reference audio (optional) */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  marginBottom: 1,
                }}
              >
                Reference Audio (Optional)
              </Typography>
              <input
                accept="audio/*"
                style={{ display: 'none' }}
                id="audio-ref-upload"
                type="file"
                onChange={(e) => handleFileChange('referenceAudio', e.target.files)}
              />
              <label htmlFor="audio-ref-upload">
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
                  Upload Reference Audio
                </Button>
              </label>
              {selectedFiles.referenceAudio && (
                <Box sx={{ marginTop: 1 }}>
                  <Chip
                    label={selectedFiles.referenceAudio.name}
                    size="small"
                    sx={{ margin: 0.5 }}
                    onDelete={() => setSelectedFiles((prev) => ({ ...prev, referenceAudio: null }))}
                  />
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Cover image shared by all types (optional) */}
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
      case CONTENT_TYPES.ACTIVITY:
      default:
        return 'Create New Activity';
    }
  };

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
          {getDialogTitle()}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3} sx={{ marginTop: '20px' }}>
          {/* Content Type Selector */}
          <FormControl fullWidth>
            <InputLabel>Content Type</InputLabel>
            <Select
              value={contentType}
              label="Content Type"
              onChange={(e) => setContentType(e.target.value)}
              sx={{
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              <MenuItem value={CONTENT_TYPES.ACTIVITY}>Activity (SCORM)</MenuItem>
              <MenuItem value={CONTENT_TYPES.BOOK}>Book (SCORM)</MenuItem>
              <MenuItem value={CONTENT_TYPES.VIDEO}>Video + SCORM</MenuItem>
              <MenuItem value={CONTENT_TYPES.AUDIO_ASSIGNMENT}>Audio Assignment</MenuItem>
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

          {/* Type-specific numeric / logical fields */}
          {renderTypeSpecificFields()}

          {/* File inputs based on type + cover image */}
          {renderFileInputs()}

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
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContentAddModal;


