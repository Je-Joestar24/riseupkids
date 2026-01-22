import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Close } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import useAuth from '../../../hooks/userHook';

/**
 * ProfileSettingsChangesPasswordForm Component
 * 
 * Form for changing parent password
 * Includes validation and password visibility toggle
 */
const ProfileSettingsChangesPasswordForm = ({ onClose, onSuccess }) => {
  const { changeUserPassword, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [formError, setFormError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError(null);
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    if (!formData.currentPassword.trim()) {
      setFormError('Current password is required');
      return false;
    }

    if (!formData.newPassword.trim()) {
      setFormError('New password is required');
      return false;
    }

    if (!formData.confirmPassword.trim()) {
      setFormError('Please confirm your new password');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setFormError('New password must be at least 6 characters');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setFormError('New passwords do not match');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      setFormError('New password must be different from current password');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await changeUserPassword(formData.currentPassword, formData.newPassword);
      
      // Clear form and close
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err) {
      // Error is already handled by the hook
      console.error('Password change error:', err);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: themeColors.bgTertiary,
        borderRadius: '12px',
        padding: { xs: '16px', sm: '20px' },
        marginTop: { xs: '12px', sm: '16px' },
        border: `1px solid ${themeColors.border}`,
      }}
    >
      {/* Form Header with Close Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: { xs: '16px', sm: '20px' },
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1rem', sm: '1.125rem' },
            fontWeight: 600,
            color: themeColors.text,
          }}
        >
          Change Your Password
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: themeColors.textSecondary,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(98, 202, 202, 0.1)',
              color: themeColors.primary,
            },
          }}
        >
          <Close sx={{ fontSize: '20px' }} />
        </IconButton>
      </Box>

      {/* Error Alert */}
      {(formError || error) && (
        <Box
          sx={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${themeColors.error}`,
            borderRadius: '8px',
            padding: { xs: '10px 12px', sm: '12px 14px' },
            marginBottom: { xs: '12px', sm: '16px' },
          }}
        >
          <Typography
            sx={{
              fontSize: '14px',
              color: themeColors.error,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 500,
            }}
          >
            {formError || error}
          </Typography>
        </Box>
      )}

      {/* Form Fields */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: '14px', sm: '16px' },
        }}
      >
        {/* Current Password */}
        <Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: themeColors.textSecondary,
              marginBottom: '8px',
            }}
          >
            Current Password
          </Typography>
          <TextField
            fullWidth
            type={showPassword.current ? 'text' : 'password'}
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            variant="outlined"
            placeholder="Enter your current password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('current')}
                    edge="end"
                    sx={{
                      color: themeColors.textSecondary,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: themeColors.primary,
                      },
                    }}
                  >
                    {showPassword.current ? (
                      <VisibilityOff sx={{ fontSize: '18px' }} />
                    ) : (
                      <Visibility sx={{ fontSize: '18px' }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: { xs: '14px', sm: '16px' },
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                borderRadius: '10px',
                '& fieldset': {
                  borderColor: themeColors.border,
                  borderWidth: '1.5px',
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
                padding: { xs: '10px 12px', sm: '10px 14px' },
              },
            }}
          />
        </Box>

        {/* New Password */}
        <Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: themeColors.textSecondary,
              marginBottom: '8px',
            }}
          >
            New Password
          </Typography>
          <TextField
            fullWidth
            type={showPassword.new ? 'text' : 'password'}
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            variant="outlined"
            placeholder="Enter your new password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('new')}
                    edge="end"
                    sx={{
                      color: themeColors.textSecondary,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: themeColors.primary,
                      },
                    }}
                  >
                    {showPassword.new ? (
                      <VisibilityOff sx={{ fontSize: '18px' }} />
                    ) : (
                      <Visibility sx={{ fontSize: '18px' }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: { xs: '14px', sm: '16px' },
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                borderRadius: '10px',
                '& fieldset': {
                  borderColor: themeColors.border,
                  borderWidth: '1.5px',
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
                padding: { xs: '10px 12px', sm: '10px 14px' },
              },
            }}
          />
        </Box>

        {/* Confirm Password */}
        <Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: themeColors.textSecondary,
              marginBottom: '8px',
            }}
          >
            Confirm Password
          </Typography>
          <TextField
            fullWidth
            type={showPassword.confirm ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            variant="outlined"
            placeholder="Confirm your new password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirm')}
                    edge="end"
                    sx={{
                      color: themeColors.textSecondary,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: themeColors.primary,
                      },
                    }}
                  >
                    {showPassword.confirm ? (
                      <VisibilityOff sx={{ fontSize: '18px' }} />
                    ) : (
                      <Visibility sx={{ fontSize: '18px' }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: { xs: '14px', sm: '16px' },
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                borderRadius: '10px',
                '& fieldset': {
                  borderColor: themeColors.border,
                  borderWidth: '1.5px',
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
                padding: { xs: '10px 12px', sm: '10px 14px' },
              },
            }}
          />
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: { xs: '10px', sm: '12px' },
            marginTop: { xs: '8px', sm: '12px' },
          }}
        >
          {/* Cancel Button */}
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{
              flex: 1,
              backgroundColor: themeColors.bgSecondary,
              color: themeColors.text,
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '14px', sm: '16px' },
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              padding: { xs: '10px 16px', sm: '10px 18px' },
              transition: 'all 0.2s ease',
              border: `1px solid ${themeColors.border}`,
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            sx={{
              flex: 1,
              backgroundColor: themeColors.secondary,
              color: themeColors.textInverse,
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '14px', sm: '16px' },
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              padding: { xs: '10px 16px', sm: '10px 18px' },
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
            {loading ? 'Updating...' : 'Change Password'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ProfileSettingsChangesPasswordForm;
