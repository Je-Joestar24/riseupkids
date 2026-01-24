import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Close, PersonAdd } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildAddModal Component
 *
 * Modal for adding a new child profile
 * Only requires name and age (no password)
 */
const ChildAddModal = ({ open, onClose, loading, onSave }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    age: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Child name is required';
    }

    if (formData.age !== '' && (isNaN(formData.age) || formData.age < 0 || formData.age > 18)) {
      newErrors.age = 'Age must be between 0 and 18';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (onSave) {
      const childData = {
        displayName: formData.displayName.trim(),
      };

      // Only include age if provided
      if (formData.age !== '') {
        childData.age = parseInt(formData.age, 10);
      }

      await onSave(childData);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({ displayName: '', age: '' });
    setErrors({});
    onClose();
  };

  const isFormValid = formData.displayName.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: themeColors.bgCard,
          backgroundImage: 'linear-gradient(in oklab, rgb(255, 255, 255) 0%, rgb(248, 250, 252) 100%)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: { xs: '16px 20px', sm: '20px 24px' },
          borderBottom: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.bgSecondary,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PersonAdd
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              color: themeColors.secondary,
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '1.125rem', sm: '1.375rem' },
              fontWeight: 700,
              color: themeColors.secondary,
            }}
          >
            Add New Child
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          aria-label="Close add child modal"
          sx={{
            color: themeColors.textSecondary,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(98, 202, 202, 0.1)',
              color: themeColors.secondary,
            },
          }}
        >
          <Close sx={{ fontSize: '24px' }} />
        </IconButton>
      </Box>

      {/* Form Content */}
      <DialogContent sx={{ padding: 0 }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: { xs: '40px 20px', sm: '60px 24px' },
            }}
          >
            <CircularProgress size={40} sx={{ color: themeColors.secondary }} />
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: '16px', sm: '20px' },
              padding: { xs: '20px', sm: '24px' },
            }}
          >
            {/* Child Name */}
            <Box>
              <Typography
                component="label"
                htmlFor="child-name-input"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '14px', sm: '16px' },
                  fontWeight: 600,
                  color: themeColors.textSecondary,
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Child Name <span style={{ color: themeColors.error }}>*</span>
              </Typography>
              <TextField
                id="child-name-input"
                fullWidth
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Enter child's name"
                variant="outlined"
                error={!!errors.displayName}
                helperText={errors.displayName}
                inputProps={{
                  'aria-label': 'Child name',
                  'aria-required': 'true',
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '16px', sm: '18px' },
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: errors.displayName ? themeColors.error : themeColors.border,
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: errors.displayName ? themeColors.error : themeColors.borderSecondary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: errors.displayName ? themeColors.error : themeColors.secondary,
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: { xs: '12px 14px', sm: '12px 16px' },
                  },
                  '& .MuiFormHelperText-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    marginLeft: 0,
                  },
                }}
              />
            </Box>

            {/* Age */}
            <Box>
              <Typography
                component="label"
                htmlFor="child-age-input"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '14px', sm: '16px' },
                  fontWeight: 600,
                  color: themeColors.textSecondary,
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Age (optional)
              </Typography>
              <TextField
                id="child-age-input"
                fullWidth
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter age (0-18)"
                variant="outlined"
                error={!!errors.age}
                helperText={errors.age}
                inputProps={{
                  min: 0,
                  max: 18,
                  'aria-label': 'Child age',
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '16px', sm: '18px' },
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: errors.age ? themeColors.error : themeColors.border,
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: errors.age ? themeColors.error : themeColors.borderSecondary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: errors.age ? themeColors.error : themeColors.secondary,
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: { xs: '12px 14px', sm: '12px 16px' },
                  },
                  '& .MuiFormHelperText-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    marginLeft: 0,
                  },
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: '12px', sm: '16px' },
                marginTop: { xs: '12px', sm: '16px' },
              }}
            >
              {/* Cancel Button */}
              <Button
                onClick={handleClose}
                disabled={loading}
                fullWidth
                aria-label="Cancel adding child"
                sx={{
                  backgroundColor: themeColors.bgSecondary,
                  color: themeColors.text,
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '14px', sm: '16px' },
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '12px',
                  padding: { xs: '12px 16px', sm: '14px 20px' },
                  border: `1px solid ${themeColors.border}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: themeColors.bgTertiary,
                    borderColor: themeColors.borderSecondary,
                  },
                  '&:disabled': {
                    opacity: 0.6,
                  },
                }}
              >
                Cancel
              </Button>

              {/* Add Button */}
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                fullWidth
                aria-label="Add child"
                sx={{
                  backgroundColor: themeColors.secondary,
                  color: themeColors.textInverse,
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '14px', sm: '16px' },
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '12px',
                  padding: { xs: '12px 16px', sm: '14px 20px' },
                  boxShadow: '0 2px 8px rgba(98, 202, 202, 0.2)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#4db5b5',
                    boxShadow: '0 4px 12px rgba(98, 202, 202, 0.3)',
                  },
                  '&:disabled': {
                    backgroundColor: themeColors.border,
                    color: themeColors.textSecondary,
                    boxShadow: 'none',
                  },
                }}
              >
                {loading ? 'Adding...' : 'Add Child'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChildAddModal;
