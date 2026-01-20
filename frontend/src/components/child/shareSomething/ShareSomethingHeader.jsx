import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../../config/themeColors';

/**
 * Arrow Left Icon Component (SVG)
 */
const ArrowLeftIcon = ({ color = 'currentColor', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 19-7-7 7-7"></path>
    <path d="M19 12H5"></path>
  </svg>
);

/**
 * ShareSomethingHeader Component
 * 
 * Header for the Share Something page
 */
const ShareSomethingHeader = ({ childId }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/child/${childId}/wall`);
  };

  return (
    <Box
      sx={{
        width: '100%',
        padding: '24px',
        borderRadius: '0px',
        border: `4px solid ${themeColors.orange}`,
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px',
      }}
    >
      {/* First Row: Back Button */}
      <Box>
        <Button
          onClick={handleBack}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0',
            minWidth: 'auto',
            backgroundColor: 'transparent',
            color: themeColors.secondary,
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 'none',
            transition: 'transform 0.3s ease',
            '&:hover': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              transform: 'scale(1.05)',
            },
          }}
          aria-label="Back to Show & Tell"
        >
          <ArrowLeftIcon color={themeColors.secondary} size={24} />
          Back to Show & Tell
        </Button>
      </Box>

      {/* Second Row: Title */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '30px',
            fontWeight: 700,
            color: themeColors.secondary,
            lineHeight: 1.2,
            textAlign: 'center'
          }}
        >
          Share Your Amazing Work!
        </Typography>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ color: 'rgb(242, 175, 16)' }}
        >
          <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
          <path d="M20 2v4"></path>
          <path d="M22 4h-4"></path>
          <circle cx="4" cy="20" r="2"></circle>
        </svg>
      </Box>

      {/* Third Row: Subtitle */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '20px',
          fontWeight: 600,
          color: 'oklch(0.551 0.027 264.364)',
          lineHeight: 1.4,
          textAlign: 'center'
        }}
      >
        Show everyone what you learned!
      </Typography>
    </Box>
  );
};

export default ShareSomethingHeader;
