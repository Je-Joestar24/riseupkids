import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItemButton,
} from '@mui/material';
import { Lock, PrivacyTip, Delete } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import ProfileSettingsChangesPasswordForm from './ProfileSettingsChangesPasswordForm';

/**
 * ProfileSettingsSecurity Component
 * 
 * Security and privacy settings for parents
 * Includes: Change Password, Privacy Settings, Delete Account
 */
const ProfileSettingsSecurity = () => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleChangePassword = () => {
    setShowPasswordForm(!showPasswordForm);
  };

  const handlePrivacySettings = () => {
    console.log('Privacy settings clicked');
    // TODO: Implement privacy settings modal
  };

  const handleDeleteAccount = () => {
    console.log('Delete account clicked');
    // TODO: Implement delete account confirmation modal
  };

  const handleClosePasswordForm = () => {
    setShowPasswordForm(false);
  };

  const handlePasswordChangeSuccess = () => {
    // Form will close automatically via onClose
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
          color: themeColors.orange,
          marginBottom: { xs: '20px', sm: '24px' },
        }}
      >
        Privacy & Security
      </Typography>

      {/* Security Options List */}
      <List
        sx={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: '12px', sm: '12px' },
        }}
      >
        {/* Change Password Button */}
        <ListItemButton
          onClick={handleChangePassword}
          sx={{
            padding: { xs: '12px 16px', sm: '14px 16px' },
            borderRadius: '12px',
            backgroundColor: showPasswordForm ? themeColors.bgTertiary : themeColors.bgSecondary,
            transition: 'all 0.2s ease',
            fontSize: { xs: '16px', sm: '18px' },
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 500,
            color: themeColors.text,
            '&:hover': {
              backgroundColor: themeColors.bgTertiary,
              transform: 'translateX(4px)',
            },
            '&:active': {
              transform: 'translateX(2px)',
            },
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Lock
            sx={{
              fontSize: '20px',
              color: themeColors.primary,
              flexShrink: 0,
            }}
          />
          Change Password
        </ListItemButton>

        {/* Password Form Dropdown */}
        {showPasswordForm && (
          <ProfileSettingsChangesPasswordForm
            onClose={handleClosePasswordForm}
            onSuccess={handlePasswordChangeSuccess}
          />
        )}

        {/* Privacy Settings Button */}
        <ListItemButton
          onClick={handlePrivacySettings}
          sx={{
            padding: { xs: '12px 16px', sm: '14px 16px' },
            borderRadius: '12px',
            backgroundColor: themeColors.bgSecondary,
            transition: 'all 0.2s ease',
            fontSize: { xs: '16px', sm: '18px' },
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 500,
            color: themeColors.text,
            '&:hover': {
              backgroundColor: themeColors.bgTertiary,
              transform: 'translateX(4px)',
            },
            '&:active': {
              transform: 'translateX(2px)',
            },
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <PrivacyTip
            sx={{
              fontSize: '20px',
              color: themeColors.primary,
              flexShrink: 0,
            }}
          />
          Privacy Settings
        </ListItemButton>

        {/* Delete Account Button */}
        <ListItemButton
          onClick={handleDeleteAccount}
          sx={{
            padding: { xs: '12px 16px', sm: '14px 16px' },
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            transition: 'all 0.2s ease',
            fontSize: { xs: '16px', sm: '18px' },
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 500,
            color: themeColors.error,
            '&:hover': {
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              transform: 'translateX(4px)',
            },
            '&:active': {
              transform: 'translateX(2px)',
            },
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Delete
            sx={{
              fontSize: '20px',
              color: themeColors.error,
              flexShrink: 0,
            }}
          />
          Delete Account
        </ListItemButton>
      </List>
    </Box>
  );
};

export default ProfileSettingsSecurity;
