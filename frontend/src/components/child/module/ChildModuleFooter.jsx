import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildModuleFooter Component
 * 
 * Footer section displaying encouraging message with star icon
 */
const ChildModuleFooter = () => {
  return (
    <Box
      sx={{
        width: '100%',
        padding: '32px',
        backgroundColor: themeColors.textInverse, // White background
        borderRadius: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', // shadow-xl
        marginTop: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {/* Star Icon - Accent background, white icon */}
      <Box
        sx={{
          width: '64px', // w-8 h-8 = 32px * 2 = 64px for larger display
          height: '64px',
          borderRadius: '50%',
          backgroundColor: themeColors.accent, // Accent background
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {/* Star icon - filled white */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
        </svg>
      </Box>

      {/* Main Title - "You're doing great!" */}
      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: 600,
          color: themeColors.primary, // Primary color
          marginBottom: '8px',
          lineHeight: 1.4,
        }}
      >
        You're doing great!
      </Typography>

      {/* Subtitle */}
      <Typography
        sx={{
          fontSize: '18px',
          fontWeight: 400,
          color: themeColors.secondary, // Secondary color
          lineHeight: 1.5,
        }}
      >
        Keep going to unlock more fun activities and earn stars!
      </Typography>
    </Box>
  );
};

export default ChildModuleFooter;
