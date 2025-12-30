import React from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { themeColors } from '../../../config/themeColors';

/**
 * ParentsChildAddButton Component
 * 
 * Button to add a new child profile
 * Displays with dashed border and plus icon
 */
const ParentsChildAddButton = ({ onClick }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        border: `4px dashed ${themeColors.border}`,
        borderRadius: '0px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        cursor: 'pointer',
        backgroundColor: 'white',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: themeColors.primary,
          backgroundColor: 'rgba(98, 202, 202, 0.05)',
        },
      }}
    >
      <AddIcon
        sx={{
          fontSize: '2.5rem',
          color: themeColors.textSecondary,
        }}
      />
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: '1.25rem',
          color: themeColors.textSecondary,
          opacity: '.8'
        }}
      >
        Add New Kid
      </Typography>
    </Box>
  );
};

export default ParentsChildAddButton;

