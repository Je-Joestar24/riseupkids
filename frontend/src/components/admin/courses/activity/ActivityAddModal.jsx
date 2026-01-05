import React, { useState } from 'react';
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
 * ActivityAddModal Component
 * 
 * Modal for creating new activities with file upload support
 */
const ActivityAddModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const { createNewActivity, loading } = useActivity();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    starsAwarded: 15,
    isPublished: false,
    tags: [],
  });

  const [selectedFiles, setSelectedFiles] = useState({
    scormFile: null,
    coverImage: null,
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type, file) => {
    if (type === 'scormFile') {
      setSelectedFiles((prev) => ({
        ...prev,
        scormFile: file ? file[0] : null,
      }));
    } else if (type === 'coverImage') {
      setSelectedFiles((prev) => ({
        ...prev,
        coverImage: file ? file[0] : null,
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate SCORM file
      if (!selectedFiles.scormFile) {
        alert('Please upload a SCORM file (ZIP format)');
        return;
      }

      // Create FormData
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('starsAwarded', formData.starsAwarded);
      formDataToSend.append('isPublished', formData.isPublished);

      // Add tags
      if (formData.tags.length > 0) {
        formDataToSend.append('tags', JSON.stringify(formData.tags));
      }

      // Add SCORM file (required)
      formDataToSend.append('scormFile', selectedFiles.scormFile);

      // Add cover image (optional)
      if (selectedFiles.coverImage) {
        formDataToSend.append('coverImage', selectedFiles.coverImage);
      }

      await createNewActivity(formDataToSend);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        starsAwarded: 15,
        isPublished: false,
        tags: [],
      });
      setSelectedFiles({ scormFile: null, coverImage: null });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      starsAwarded: 15,
      isPublished: false,
      tags: [],
    });
    setSelectedFiles({ scormFile: null, coverImage: null });
    onClose();
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
          borderBottom: `1px solid ${theme.palette.border.main}`
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
          }}
        >
          Create New Activity
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3}}>
        <Stack spacing={3} sx={{marginTop: '20px' }}>
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
                fontFamily: 'Quicksand, sans-serif'
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

          {/* SCORM File Upload (Required) */}
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
              id="scorm-upload"
              type="file"
              onChange={(e) => handleFileChange('scormFile', e.target.files)}
            />
            <label htmlFor="scorm-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                required
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
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.75rem',
                marginTop: 0.5,
                display: 'block',
              }}
            >
              SCORM files must be in ZIP format. Maximum file size: 500MB
            </Typography>
          </Box>

          {/* Cover Image Upload (Optional) */}
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
          disabled={loading || !formData.title || !selectedFiles.scormFile}
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
          {loading ? 'Creating...' : 'Create Activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivityAddModal;

