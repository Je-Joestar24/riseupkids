import React from 'react';
import { Box, Typography } from '@mui/material';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildProgressModalProgressOverview Component
 * 
 * Displays progress overview with Total Stars and Learning Time
 * Minimalist layout with icon and description side by side
 */
const ChildProgressModalProgressOverview = ({ totalStars, learningTimeHours, childName }) => {
  const formatLearningTime = (hours) => {
    if (!hours || hours === 0) return '0h';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    return `${hours}h`;
  };

  return (
    <Box
      sx={{
        backgroundColor: themeColors.secondary,
        borderRadius: { xs: '12px', sm: '16px' },
        padding: { xs: 2, sm: 3 },
        marginBottom: 3,
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '24px',
          fontWeight: 700,
          color: themeColors.textInverse,
          marginBottom: 3,
        }}
      >
        {childName}'s Progress Overview
      </Typography>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 3 },
          justifyContent: 'space-around',
        }}
      >
        {/* Total Stars Card */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            flex: 1,
            backgroundColor: 'oklab(0.999994 0.0000455678 0.0000200868 / 0.2)',
            borderRadius: { xs: '12px', sm: '16px' },
            padding: '16px'
          }}
        >
          {/* Icon and Description Row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <StarBorderIcon
              sx={{
                fontSize: '20px',
                color: themeColors.textInverse,
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: themeColors.textInverse,
              }}
            >
              Total Stars
            </Typography>
          </Box>
          {/* Count */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '36px',
              fontWeight: 700,
              color: themeColors.textInverse,
              lineHeight: 1,
            }}
          >
            {totalStars || 0}
          </Typography>
        </Box>

        {/* Learning Time Card */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            flex: 1,
            backgroundColor: 'oklab(0.999994 0.0000455678 0.0000200868 / 0.2)',
            borderRadius: { xs: '12px', sm: '16px' },
            padding: '16px'
          }}
        >
          {/* Icon and Description Row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AccessTimeOutlinedIcon
              sx={{
                fontSize: '20px',
                color: themeColors.textInverse,
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: themeColors.textInverse,
              }}
            >
              Learning Time
            </Typography>
          </Box>
          {/* Count */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '36px',
              fontWeight: 700,
              color: themeColors.textInverse,
              lineHeight: 1,
            }}
          >
            {formatLearningTime(learningTimeHours)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ChildProgressModalProgressOverview;
