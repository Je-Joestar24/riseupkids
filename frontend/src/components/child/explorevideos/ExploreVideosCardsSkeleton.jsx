import React from 'react';
import { Box, Paper } from '@mui/material';
import { EXPLORE_COVER_ASPECT_RATIO } from '../../../constants/exploreVideoTypes';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';
import { phoneFluid } from '../../../constants/childPhoneLayout';

const CARD_COUNT = 6;

/**
 * First-load placeholder for the video list: the same grid of video cards as the real page (cover with
 * its duration badge, title, two description lines, full-width button), so nothing moves when the
 * videos arrive.
 */
const ExploreVideosCardsSkeleton = () => (
  <SkeletonFrame label="Loading videos" sx={{ width: '100%' }}>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: '20px',
        width: '100%',
      }}
    >
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <Paper key={index} sx={{ borderRadius: '0px', overflow: 'hidden', backgroundColor: 'white' }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: { xs: 'auto', sm: EXPLORE_COVER_ASPECT_RATIO },
              height: { xs: '192px', sm: 'auto' },
            }}
          >
            <Bone variant="rectangular" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            <Bone
              sx={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                width: 64,
                height: 30,
                borderRadius: '22px',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
              }}
            />
          </Box>
          <Box sx={{ padding: { xs: phoneFluid(14, 20), sm: '20px' }, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Bone sx={{ width: '75%', height: 24 }} />
            <Box>
              <Bone sx={{ width: '100%', height: 16, marginBottom: '6px' }} />
              <Bone sx={{ width: '60%', height: 16 }} />
            </Box>
            <Bone variant="rectangular" sx={{ width: '100%', height: 52 }} />
          </Box>
        </Paper>
      ))}
    </Box>
  </SkeletonFrame>
);

export default ExploreVideosCardsSkeleton;
