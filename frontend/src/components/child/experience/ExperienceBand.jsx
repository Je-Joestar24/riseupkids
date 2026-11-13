import React from 'react';
import { Box } from '@mui/material';
import { phoneFluid } from '../../../constants/childPhoneLayout';

/**
 * A full-width coloured band with its content in a centred column, like the phone app's Experience page and the free
 * Experience page on the sales site. On a phone the band keeps a 16-20px gutter and trims its height; from 900px up it
 * gets more room, and a `wide` band (the videos) widens to 900px so a video is not a postage stamp on a computer.
 *
 * `minWidth: 0` on the column lets long words wrap instead of pushing the page sideways.
 */
const ExperienceBand = ({ color, label, compact = false, wide = false, children }) => (
  <Box
    component="section"
    aria-label={label}
    sx={{
      backgroundColor: color,
      py: compact
        ? { xs: phoneFluid(16, 20), sm: '20px', md: '28px' }
        : { xs: phoneFluid(28, 40), sm: '40px', md: '56px' },
      px: { xs: phoneFluid(16, 20), sm: '24px', md: '32px' },
    }}
  >
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: wide ? { xs: '100%', sm: '620px', md: '900px' } : '560px',
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? { xs: '14px', sm: '16px' } : 0,
      }}
    >
      {children}
    </Box>
  </Box>
);

export default ExperienceBand;
