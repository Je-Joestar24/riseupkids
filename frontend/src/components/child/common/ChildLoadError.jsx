import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * Load failure with a retry. Full page by default; `compact` is for one section of a page.
 * `inverse` is for pages on the teal background (white text).
 */
const ChildLoadError = ({ message, onRetry, inverse = false, background, compact = false }) => (
  <Box
    role="alert"
    sx={{
      minHeight: compact ? 'auto' : '100vh',
      backgroundColor: background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: compact ? '24px 16px' : { xs: '16px', sm: '32px' },
    }}
  >
    <Typography
      sx={{
        color: inverse ? themeColors.textInverse : themeColors.text,
        fontSize: '18px',
        textAlign: 'center',
      }}
    >
      {message}
    </Typography>
    {onRetry && (
      <Button
        variant="contained"
        onClick={onRetry}
        sx={{
          backgroundColor: themeColors.orange,
          color: themeColors.textInverse,
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': { backgroundColor: themeColors.orange },
        }}
      >
        Try again
      </Button>
    )}
  </Box>
);

export default ChildLoadError;
