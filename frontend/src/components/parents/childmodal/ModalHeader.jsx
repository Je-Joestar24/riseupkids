import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';

/**
 * ModalHeader Component
 * 
 * Header for child edit modal
 */
const ModalHeader = ({ childName, onClose }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: { xs: '16px 20px', sm: '20px 24px' },
        borderBottom: `1px solid ${themeColors.border}`,
        backgroundColor: themeColors.bgSecondary,
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.125rem', sm: '1.375rem' },
          fontWeight: 700,
          color: themeColors.secondary,
        }}
      >
        Edit {childName}
      </Typography>
      <IconButton
        onClick={onClose}
        sx={{
          color: themeColors.textSecondary,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(98, 202, 202, 0.1)',
            color: themeColors.secondary,
          },
        }}
      >
        <Close sx={{ fontSize: '24px' }} />
      </IconButton>
    </Box>
  );
};

export default ModalHeader;
