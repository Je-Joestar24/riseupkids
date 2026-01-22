import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { themeColors } from '../../../config/themeColors';

/**
 * AccountSettingsHeader Component
 * 
 * Header with gradient background for Account Settings modal
 * Matches ProgressModal and ContactSupportModal header style
 */
const AccountSettingsHeader = ({ onClose }) => {
  return (
    <Box
      sx={{
        backgroundImage: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
        borderTopLeftRadius: { xs: '16px', sm: '20px' },
        borderTopRightRadius: { xs: '16px', sm: '20px' },
        padding: { xs: '16px 20px', sm: '24px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1rem', sm: '1.4rem' },
          fontWeight: 700,
          color: themeColors.textInverse,
        }}
      >
        Account Settings
      </Typography>

      <IconButton
        onClick={onClose}
        sx={{
          width: { xs: '40px', sm: '40px' },
          height: { xs: '40px', sm: '40px' },
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: themeColors.textInverse,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: { xs: '20px', sm: '24px' } }} />
      </IconButton>
    </Box>
  );
};

export default AccountSettingsHeader;
