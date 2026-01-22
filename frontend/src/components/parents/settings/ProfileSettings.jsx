import React from 'react';
import { Box } from '@mui/material';
import ProfileSettingsInformation from './ProfileSettingsInformation';
import ProfileSettingsSecurity from './ProfileSettingsSecurity';

/**
 * ProfileSettings Component
 * 
 * Main settings page combining account information and security settings
 * Displays:
 * - Account Information (parent name, email, child profiles)
 * - Privacy & Security settings
 */
const ProfileSettings = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: '20px', sm: '24px' },
        width: '100%',
      }}
    >
      {/* Profile Settings Information */}
      <ProfileSettingsInformation />

      {/* Privacy & Security Settings */}
      <ProfileSettingsSecurity />
    </Box>
  );
};

export default ProfileSettings;
