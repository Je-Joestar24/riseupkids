import React from 'react';
import { Box } from '@mui/material';
import { EXPLORE_COVER_ASPECT_RATIO } from '../../../constants/exploreVideoTypes';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';

const CARD_COUNT = 3;

/**
 * First-load placeholder for the "Watch Replays" row: a heading and cards in the real sizes. The whole
 * row is a placeholder (not just its numbers) because the row only exists when there are replays.
 */
const ExploreReplaysSkeleton = () => (
  <SkeletonFrame label="Loading replays" sx={{ marginBottom: 4 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <Bone sx={{ width: 200, height: 32 }} />
      <Bone sx={{ width: 72, height: 24 }} />
    </Box>
    <Box sx={{ display: 'flex', gap: 2, overflow: 'hidden', paddingBottom: 1 }}>
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <Box key={index} sx={{ width: '288px', flexShrink: 0, backgroundColor: 'white', overflow: 'hidden' }}>
          <Bone variant="rectangular" sx={{ width: '100%', aspectRatio: EXPLORE_COVER_ASPECT_RATIO }} />
          <Box sx={{ padding: '16px' }}>
            <Bone sx={{ width: '80%', height: 24, marginBottom: '8px' }} />
            <Bone sx={{ width: '50%', height: 18 }} />
          </Box>
        </Box>
      ))}
    </Box>
  </SkeletonFrame>
);

export default ExploreReplaysSkeleton;
