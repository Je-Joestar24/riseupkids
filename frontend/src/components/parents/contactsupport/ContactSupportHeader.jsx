import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { themeColors } from '../../../config/themeColors';

/**
 * ContactSupportHeader Component
 * 
 * Header section for Contact Support modal
 * Shows title and close button with gradient background
 */
const ContactSupportHeader = ({ onClose }) => {
  return (
    <Box
      sx={{
        background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
        borderRadius: { xs: '20px 20px 0 0', sm: '24px 24px 0 0' },
        padding: { xs: 3, sm: 3.75 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.5rem', sm: '1.5rem' },
          fontWeight: 700,
          color: themeColors.textInverse,
        }}
      >
        Contact Support
      </Typography>
      <IconButton
        onClick={onClose}
        sx={{
          width: { xs: 40, sm: 40 },
          height: { xs: 40, sm: 40 },
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: themeColors.textInverse,
          borderRadius: '50%',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 24 }} />
      </IconButton>
    </Box>
  );
};

export default ContactSupportHeader;
