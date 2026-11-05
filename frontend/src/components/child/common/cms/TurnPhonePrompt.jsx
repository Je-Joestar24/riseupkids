import React from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { themeColors } from '../../../../config/themeColors';

const turn = keyframes`
  0%, 15% { transform: rotate(0deg); }
  55%, 85% { transform: rotate(-90deg); }
  100% { transform: rotate(0deg); }
`;

/**
 * Shown over the built-in book while a phone is held upright: the pages are made for a wide screen, so the
 * child is asked to turn the phone. It only covers the book (which stays where it was, with its page, audio
 * and progress) and leaves the Close button above it usable. Turning the phone removes it.
 */
const TurnPhonePrompt = () => (
  <Box
    role="status"
    aria-live="polite"
    sx={{
      position: 'absolute',
      inset: 0,
      zIndex: 15,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2.5,
      px: 3,
      textAlign: 'center',
      background: 'linear-gradient(180deg, #fffaf2 0%, #fff3e6 100%)',
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 72,
        height: 112,
        animation: `${turn} 3s ease-in-out infinite`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none', transform: 'rotate(-90deg)' },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 72 112"
        width="72"
        height="112"
        sx={{ display: 'block' }}
      >
        <rect x="4" y="4" width="64" height="104" rx="12" fill="#fff" stroke={themeColors.secondary} strokeWidth="5" />
        <rect x="14" y="16" width="44" height="72" rx="4" fill={themeColors.primary} opacity="0.35" />
        <circle cx="36" cy="98" r="4" fill={themeColors.secondary} />
      </Box>
    </Box>

    <Typography
      component="h2"
      sx={{
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 800,
        fontSize: '1.5rem',
        lineHeight: 1.2,
        color: '#141414',
      }}
    >
      Turn your phone sideways
    </Typography>
    <Typography
      sx={{
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 600,
        fontSize: '1.05rem',
        color: '#414141',
        maxWidth: 280,
      }}
    >
      Your book is bigger and easier to read when your phone is on its side.
    </Typography>
  </Box>
);

export default TurnPhonePrompt;
