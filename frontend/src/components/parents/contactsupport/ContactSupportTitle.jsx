import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ContactSupportTitle Component
 * 
 * Title section with gradient background
 * Displays "Support & Help" title and description
 */
const ContactSupportTitle = () => {
  return (
    <Box
      sx={{
        background: `linear-gradient(to bottom right, ${themeColors.secondary}, ${themeColors.primary})`,
        borderRadius: { xs: '20px', sm: '24px' },
        padding: { xs: 3, sm: 3.75 },
        color: themeColors.textInverse,
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.5rem', sm: '1.5rem' },
          fontWeight: 700,
          color: themeColors.textInverse,
          marginBottom: 1,
        }}
      >
        Support & Help
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1rem', sm: '1.125rem' },
          fontWeight: 400,
          color: themeColors.textInverse,
          opacity: 0.9,
        }}
      >
        Frequently asked questions and contact form
      </Typography>
    </Box>
  );
};

export default ContactSupportTitle;
