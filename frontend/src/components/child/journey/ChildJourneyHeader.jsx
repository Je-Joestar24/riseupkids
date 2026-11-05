import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { themeColors } from '../../../config/themeColors';
import { InlineBone } from '../common/ChildSkeleton';
import { phoneFluid } from '../../../constants/childPhoneLayout';

/**
 * ChildJourneyHeader Component
 * 
 * Header section for My Journey page
 * Displays title and subtitle with white text. While the courses load, the title shows as usual and
 * the step holds its place.
 */
const ChildJourneyHeader = ({ week = 3, totalWeeks = 36, loading = false }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '848px',
        backgroundColor: 'transparent',
        marginBottom: { xs: phoneFluid(14, 24), sm: '32px' },
        textAlign: 'center',
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontSize: { xs: phoneFluid(24, 32), sm: '36px' },
          // phones: the app's tight 1.15 (computers and tablets keep the page's usual 1.6)
          lineHeight: { xs: 1.15, sm: 1.6 },
          fontWeight: 600,
          color: themeColors.textInverse, // White color
          marginBottom: { xs: phoneFluid(8, 14), sm: '8px' },
          fontFamily: theme.typography.fontFamily,
        }}
      >
        My Journey
      </Typography>

      {/* Subtitle - Progress */}
      <Typography
        sx={{
          fontSize: { xs: phoneFluid(16, 20), sm: '20px' },
          fontWeight: 600,
          color: themeColors.textInverse, // White color
          fontFamily: theme.typography.fontFamily,
        }}
      >
        {loading ? <InlineBone width="140px" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.35)' }} /> : `Step ${week} of ${totalWeeks}`}
      </Typography>
    </Box>
  );
};

export default ChildJourneyHeader;
