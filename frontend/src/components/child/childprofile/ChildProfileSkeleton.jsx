import React from 'react';
import { Box, Paper } from '@mui/material';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';

const BADGE_COUNT = 8;
const WIN_COUNT = 2;

const cardSx = {
  padding: { xs: '20px', sm: '24px' },
  backgroundColor: 'white',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  borderRadius: '24px',
};

/**
 * First-load placeholder for the Profile page: the same four blocks in the same order and sizes as the
 * real page (name card with three stat boxes, next-level bar, badge grid, latest wins), so nothing moves
 * when the profile arrives.
 */
const ChildProfileSkeleton = () => (
  <SkeletonFrame
    label="Loading your profile"
    sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '16px', sm: '20px' } }}
  >
    {/* Name card: avatar, name and level, then Total Stars / Streak / Badges */}
    <Paper sx={cardSx}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: '16px', sm: '24px' },
          marginBottom: { xs: '20px', sm: '24px' },
        }}
      >
        <Bone variant="circular" sx={{ width: 80, height: 80, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Bone sx={{ width: '70%', height: 36, marginBottom: '4px' }} />
          <Bone sx={{ width: '40%', height: 24 }} />
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: '12px', sm: '16px' } }}>
        {[0, 1, 2].map((index) => (
          <Bone key={index} sx={{ height: { xs: 118, sm: 142 }, borderRadius: '16px' }} />
        ))}
      </Box>
    </Paper>

    {/* Next level: title, bar, message */}
    <Paper sx={cardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Bone variant="circular" sx={{ width: 32, height: 32, flexShrink: 0 }} />
        <Bone sx={{ width: '50%', height: 29 }} />
      </Box>
      <Bone sx={{ width: '100%', height: 16, borderRadius: '9999px', marginBottom: '8px' }} />
      <Bone sx={{ width: '60%', height: 22 }} />
    </Paper>

    {/* All badges: title and the grid */}
    <Box sx={{ padding: { xs: '20px', sm: '24px' } }}>
      <Bone sx={{ width: '45%', height: { xs: 24, sm: 29 }, marginBottom: { xs: '16px', sm: '20px' } }} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: '16px', sm: '24px' },
        }}
      >
        {Array.from({ length: BADGE_COUNT }, (_, index) => (
          <Bone key={index} sx={{ height: { xs: 140, sm: 160 }, borderRadius: '24px' }} />
        ))}
      </Box>
    </Box>

    {/* Latest wins: title and rows */}
    <Paper sx={cardSx}>
      <Bone sx={{ width: '40%', height: { xs: 24, sm: 29 }, marginBottom: '16px' }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: WIN_COUNT }, (_, index) => (
          <Bone key={index} sx={{ height: { xs: 68, sm: 80 }, borderRadius: '16px' }} />
        ))}
      </Box>
    </Paper>
  </SkeletonFrame>
);

export default ChildProfileSkeleton;
