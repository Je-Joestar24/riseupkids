import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * LanguageSettingsHeader Component
 * 
 * Header for language settings section
 */
const LanguageSettingsHeader = () => {
  return (
    <Box sx={{ marginBottom: { xs: '20px', sm: '24px' } }}>
      {/* Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.25rem', sm: '1.375rem' },
          fontWeight: 600,
          color: themeColors.secondary,
          marginBottom: { xs: '12px', sm: '16px' },
        }}
      >
        App Language
      </Typography>

      {/* Description */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '15px', sm: '16px' },
          fontWeight: 500,
          color: themeColors.textSecondary,
          lineHeight: 1.6,
        }}
      >
        Choose the language for your child's learning experience
      </Typography>
    </Box>
  );
};

export default LanguageSettingsHeader;
