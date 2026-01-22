import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ModalForm Component
 * 
 * Form for editing child profile details
 */
const ModalForm = ({ child, loading, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    age: '',
  });

  const [initialData, setInitialData] = useState({
    displayName: '',
    age: '',
  });

  useEffect(() => {
    if (child) {
      const data = {
        displayName: child.displayName || child.name || '',
        age: child.age || '',
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [child]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  if (loading) {
    return (
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
    );
  }

  return (
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
      {/* Display Name */}
      <Box>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '14px', sm: '16px' },
            fontWeight: 600,
            color: themeColors.textSecondary,
            marginBottom: '8px',
          }}
        >
          Display Name
        </Typography>
        <TextField
          fullWidth
          name="displayName"
          value={formData.displayName}
          onChange={handleChange}
          placeholder="Enter child's display name"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '16px', sm: '18px' },
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              borderRadius: '12px',
              '& fieldset': {
                borderColor: themeColors.border,
                borderWidth: '2px',
              },
              '&:hover fieldset': {
                borderColor: themeColors.borderSecondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: themeColors.secondary,
                borderWidth: '2px',
              },
            },
            '& .MuiOutlinedInput-input': {
              padding: { xs: '12px 14px', sm: '12px 16px' },
            },
          }}
        />
      </Box>

      {/* Age */}
      <Box>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '14px', sm: '16px' },
            fontWeight: 600,
            color: themeColors.textSecondary,
            marginBottom: '8px',
          }}
        >
          Age
        </Typography>
        <TextField
          fullWidth
          name="age"
          type="number"
          value={formData.age}
          onChange={handleChange}
          placeholder="Enter age (0-18)"
          inputProps={{ min: 0, max: 18 }}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '16px', sm: '18px' },
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              borderRadius: '12px',
              '& fieldset': {
                borderColor: themeColors.border,
                borderWidth: '2px',
              },
              '&:hover fieldset': {
                borderColor: themeColors.borderSecondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: themeColors.secondary,
                borderWidth: '2px',
              },
            },
            '& .MuiOutlinedInput-input': {
              padding: { xs: '12px 14px', sm: '12px 16px' },
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
          onClick={onCancel}
          disabled={loading}
          fullWidth
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

        {/* Save Button */}
        <Button
          type="submit"
          disabled={!hasChanges || loading}
          fullWidth
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
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
};

export default ModalForm;
