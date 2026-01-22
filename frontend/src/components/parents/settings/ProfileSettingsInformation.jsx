import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import useAuth from '../../../hooks/userHook';

/**
 * ProfileSettingsInformation Component
 * 
 * Account information form for parents
 * Shows parent name and email
 */
const ProfileSettingsInformation = () => {
  const { user, updateUserProfile, loading } = useAuth();

  const [formData, setFormData] = useState({
    parentName: '',
    email: '',
  });

  const [initialData, setInitialData] = useState({
    parentName: '',
    email: '',
  });

  // Initialize parent form data from user
  useEffect(() => {
    if (user) {
      const userData = {
        parentName: user.name || '',
        email: user.email || '',
      };
      setFormData(userData);
      setInitialData(userData);
    }
  }, [user]);

  const handleParentChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Check if there are changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSaveParent = async () => {
    try {
      // Prepare the update data
      const updateData = {
        name: formData.parentName,
        email: formData.email,
      };

      // Call the hook to update profile
      await updateUserProfile(updateData);

      // Update initial data to reflect saved state
      setInitialData(formData);
    } catch (error) {
      console.error('Error saving parent settings:', error);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: themeColors.bgCard,
        borderRadius: { xs: '20px', sm: '24px' },
        padding: { xs: '20px', sm: '24px' },
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Section Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.25rem', sm: '1.375rem' },
          fontWeight: 600,
          color: themeColors.secondary,
          marginBottom: { xs: '20px', sm: '24px' },
        }}
      >
        Account Information
      </Typography>

      {/* Form Fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '16px', sm: '20px' } }}>
        {/* Parent Name */}
        <Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '0.875rem', sm: '18px' },
              fontWeight: 600,
              color: themeColors.textSecondary,
              marginBottom: { xs: '8px', sm: '10px' },
            }}
          >
            Parent Name
          </Typography>
          <TextField
            fullWidth
            name="parentName"
            value={formData.parentName}
            onChange={handleParentChange}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: { xs: '16px', sm: '18px' },
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                borderRadius: { xs: '12px', sm: '12px' },
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
                padding: { xs: '12px 16px', sm: '12px 16px' },
              },
            }}
          />
        </Box>

        {/* Email */}
        <Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '0.875rem', sm: '0.938rem' },
              fontWeight: 600,
              color: themeColors.textSecondary,
              marginBottom: { xs: '8px', sm: '10px' },
            }}
          >
            Email
          </Typography>
          <TextField
            fullWidth
            type="email"
            name="email"
            value={formData.email}
            onChange={handleParentChange}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: { xs: '16px', sm: '18px' },
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                borderRadius: { xs: '12px', sm: '12px' },
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
                padding: { xs: '12px 16px', sm: '12px 16px' },
              },
            }}
          />
        </Box>

        {/* Save Parent Button - Only show if there are changes */}
        {hasChanges && (
          <Button
            fullWidth
            onClick={handleSaveParent}
            disabled={loading}
            sx={{
              backgroundColor: themeColors.secondary,
              color: themeColors.textInverse,
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: { xs: '16px', sm: '20px' },
              padding: { xs: '14px 24px', sm: '14px 24px' },
              marginTop: { xs: '8px', sm: '12px' },
              boxShadow: '0 4px 12px rgba(98, 202, 202, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#4db5b5',
                boxShadow: '0 6px 16px rgba(98, 202, 202, 0.4)',
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
        )}
      </Box>
    </Box>
  );
};

export default ProfileSettingsInformation;
