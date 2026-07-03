import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';
import { themeColors } from '../../../../config/themeColors';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/** Rotating loader for CMS player preload / save states (web parity with app). */
const CmsPlayerLoadingSpinner = ({
  size = 40,
  color = themeColors.secondary,
  accessibilityLabel = 'Loading',
}) => (
  <Box
    role="progressbar"
    aria-label={accessibilityLabel}
    sx={{
      width: size,
      height: size,
      animation: `${spin} 900ms linear infinite`,
    }}
  >
    <Box
      component="svg"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - Math.max(2.5, size * 0.08)) / 2}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(2.5, size * 0.08)}
        strokeOpacity={0.22}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - Math.max(2.5, size * 0.08)) / 2}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(2.5, size * 0.08)}
        strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * ((size - Math.max(2.5, size * 0.08)) / 2) * 0.72} ${2 * Math.PI * ((size - Math.max(2.5, size * 0.08)) / 2)}`}
      />
    </Box>
  </Box>
);

export default CmsPlayerLoadingSpinner;
