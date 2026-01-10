import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildJourneyHeader Component
 * 
 * Header section for My Journey page
 * Displays title and subtitle with white text
 */
const ChildJourneyHeader = ({ week = 3, totalWeeks = 36 }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '848px',
        backgroundColor: 'transparent',
        marginBottom: '32px',
        textAlign: 'center',
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontSize: '36px',
          fontWeight: 600,
          color: themeColors.textInverse, // White color
          marginBottom: '8px',
          fontFamily: theme.typography.fontFamily,
        }}
      >
        My Journey
      </Typography>

      {/* Subtitle - Progress */}
      <Typography
        sx={{
          fontSize: '20px',
          fontWeight: 600,
          color: themeColors.textInverse, // White color
          fontFamily: theme.typography.fontFamily,
        }}
      >
        Step {week} of {totalWeeks}
      </Typography>
    </Box>
  );
};

export default ChildJourneyHeader;
