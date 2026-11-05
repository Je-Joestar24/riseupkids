import React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Laid over a page's Next button while the next page's files are still on their way: a small spinner on the
 * button instead of a full-screen wait. Only drawn while the button is locked.
 */
const CmsNextButtonWait = () => (
  <Box
    component="span"
    role="status"
    aria-label="Getting the next page ready"
    sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
  >
    <CircularProgress size="46%" thickness={5} sx={{ color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
  </Box>
);

/** Dims the button's picture while locked. */
export const lockedNextButtonSx = (locked) => (locked ? { '& img': { opacity: 0.55 } } : {});

export default CmsNextButtonWait;
