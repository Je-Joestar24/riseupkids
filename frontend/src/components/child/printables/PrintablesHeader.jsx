import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

const ArrowLeftIcon = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const PrinterIcon = ({ size = 48 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path>
    <rect x="6" y="14" width="12" height="8" rx="1"></rect>
  </svg>
);

const PrintablesHeader = ({
  onBack,
  stepNumber = 3,
  title = 'Printables',
  subtitle = 'Download and print these fun worksheets!',
}) => {
  return (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        boxShadow: '0 12px 28px rgba(0,0,0,0.10)',
        mb: { xs: 3, sm: 4 },
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 0, // keep overall pointed; only specific elements are rounded
      }}
    >
      <ButtonBase
        onClick={onBack}
        aria-label="Go back to journey"
        sx={{
          mb: { xs: 2, sm: 3 },
          border: `2px solid ${themeColors.secondary}`,
          backgroundColor: '#ffffff',
          width: 48,
          height: 48,
          borderRadius: '9999px', // circular button
          boxShadow: '0 12px 28px rgba(0,0,0,0.10)',
          transition: 'transform 200ms ease, box-shadow 200ms ease',
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: '0 22px 50px rgba(0,0,0,0.14)',
          },
          '&:active': {
            transform: 'scale(0.96)',
          },
          color: themeColors.secondary,
        }}
      >
        <ArrowLeftIcon />
      </ButtonBase>

      <Box
        sx={{
          mb: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        {/* Step badge */}
        <Box
          sx={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            p: 0.5, // p-1
            boxShadow: '0 12px 28px rgba(0,0,0,0.08)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.25,
              backgroundColor: themeColors.accent,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {/* Static icon placeholder for the step badge */}
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: 2, // slightly rounded square
                backgroundColor: themeColors.textInverse,
                boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
              }}
              aria-hidden="true"
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: themeColors.textInverse,
              }}
            >
              Step {stepNumber}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 4 }, mb: 1.5 }}>
        <Box sx={{ color: themeColors.secondary, display: 'flex', alignItems: 'center' }}>
          <PrinterIcon />
        </Box>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '2.25rem', sm: '2.75rem' },
            fontWeight: 700,
            color: themeColors.secondary,
            lineHeight: 1.1,
          }}
        >
          {title}
        </Typography>
      </Box>

      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.1rem', sm: '1.25rem' },
          fontWeight: 600,
          color: themeColors.primary,
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  );
};

export default PrintablesHeader;

