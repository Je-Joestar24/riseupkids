import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildProgressModalHeader Component
 * 
 * Header section for child progress modal
 * Shows title and close button
 */
const ChildProgressModalHeader = ({ childName, onClose }) => {
  return (
    <Box
      sx={{
        backgroundColor: themeColors.secondary,
        color: themeColors.textInverse,
        padding: { xs: 2, sm: 3 },
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: { xs: '16px 16px 0 0', sm: '20px 20px 0 0' },
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 700,
          color: themeColors.textInverse,
        }}
      >
        Child Progress
      </Typography>
      <IconButton
        onClick={onClose}
        sx={{
          color: themeColors.textInverse,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>
  );
};

export default ChildProgressModalHeader;
