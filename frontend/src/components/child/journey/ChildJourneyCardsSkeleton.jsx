import React from 'react';
import { Box } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';

const CARD_COUNT = 6;

/**
 * First-load placeholder for the My Journey card grid: the same 3-column square-cover grid as the real
 * cards, so nothing moves when the courses arrive. The title, step and summary are not part of it —
 * they stay on screen and hold only their changing values.
 */
const ChildJourneyCardsSkeleton = () => (
  <SkeletonFrame label="Loading your journey" sx={{ width: '100%', maxWidth: '848px' }}>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: '16px',
      }}
    >
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <Box key={index} sx={{ backgroundColor: themeColors.bgCard, overflow: 'hidden' }}>
          <Bone variant="rectangular" sx={{ width: '100%', aspectRatio: '1 / 1' }} />
          <Box sx={{ padding: '16px' }}>
            <Bone sx={{ width: '70%', height: 22, marginBottom: '8px' }} />
            <Bone sx={{ width: '90%', height: 18 }} />
          </Box>
        </Box>
      ))}
    </Box>
  </SkeletonFrame>
);

export default ChildJourneyCardsSkeleton;
