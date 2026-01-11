import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildModuleProgress Component
 * 
 * Progress tracking component for course detail page
 * Shows course title, description, progress bar, and summary cards
 */
const ChildModuleProgress = ({
  courseTitle,
  courseDescription,
  completedCount,
  todoCount,
  lockedCount,
  totalCount,
}) => {
  // Calculate progress percentage
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Box
      sx={{
        width: '100%',
        padding: '32px',
        backgroundColor: themeColors.textInverse, // white
        borderRadius: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', // shadow-xl
        marginTop: '32px',
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontSize: '36px',
          fontWeight: 600,
          color: 'rgb(51, 51, 51)',
          marginBottom: '12px',
        }}
      >
        {courseTitle || 'Course Title'}
      </Typography>

      {/* Description */}
      <Typography
        sx={{
          fontSize: '20px',
          fontWeight: 400,
          color: 'rgb(51, 51, 51)',
          marginBottom: '24px',
        }}
      >
        {courseDescription || 'Course description'}
      </Typography>

      {/* Progress Bar Section */}
      <Box sx={{ marginBottom: '24px' }}>
        {/* Progress Label and Count */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgb(51, 51, 51)',
            }}
          >
            Your Progress
          </Typography>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgb(51, 51, 51)',
            }}
          >
            {completedCount} of {totalCount} completed
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box
          sx={{
            height: '16px',
            borderRadius: '9999px', // rounded-full
            overflow: 'hidden',
            backgroundColor: 'rgb(212, 230, 227)', // Empty part color
            position: 'relative',
          }}
        >
          {/* Filled Progress */}
          <Box
            sx={{
              height: '100%',
              width: `${progressPercentage}%`,
              backgroundColor: themeColors.secondary, // rgb(98, 202, 202)
              borderRadius: '9999px',
              transition: 'all 0.5s ease',
            }}
          />
        </Box>
      </Box>

      {/* Summary Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: '16px',
          marginTop: '24px',
        }}
      >
        {/* Completed Card */}
        <Box
          sx={{
            textAlign: 'center',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'rgb(244, 237, 216)',
          }}
        >
          {/* Icon Container */}
          <Box
            sx={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              margin: '0 auto 8px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeColors.secondary, // rgb(98, 202, 202)
            }}
          >
            {/* Circle-check icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: themeColors.textInverse }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </Box>
          {/* Count */}
          <Typography
            sx={{
              fontSize: '24px',
              fontWeight: 600,
              color: themeColors.text, // black
              marginBottom: '4px',
            }}
          >
            {completedCount}
          </Typography>
          {/* Label */}
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgb(153, 153, 153)',
            }}
          >
            Completed
          </Typography>
        </Box>

        {/* To Do Card */}
        <Box
          sx={{
            textAlign: 'center',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'rgb(244, 237, 216)',
          }}
        >
          {/* Icon Container */}
          <Box
            sx={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              margin: '0 auto 8px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeColors.accent, // rgb(242, 175, 16)
            }}
          >
            {/* Star icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: themeColors.textInverse }}
              aria-hidden="true"
            >
              <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
            </svg>
          </Box>
          {/* Count */}
          <Typography
            sx={{
              fontSize: '24px',
              fontWeight: 600,
              color: themeColors.text, // black
              marginBottom: '4px',
            }}
          >
            {todoCount}
          </Typography>
          {/* Label */}
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgb(153, 153, 153)',
            }}
          >
            To Do
          </Typography>
        </Box>

        {/* Locked Card */}
        <Box
          sx={{
            textAlign: 'center',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'rgb(244, 237, 216)',
          }}
        >
          {/* Icon Container */}
          <Box
            sx={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              margin: '0 auto 8px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeColors.orange, // rgb(233, 138, 104)
            }}
          >
            {/* Lock icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: themeColors.textInverse }}
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </Box>
          {/* Count */}
          <Typography
            sx={{
              fontSize: '24px',
              fontWeight: 600,
              color: themeColors.text, // black
              marginBottom: '4px',
            }}
          >
            {lockedCount}
          </Typography>
          {/* Label */}
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgb(153, 153, 153)',
            }}
          >
            Locked
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ChildModuleProgress;
