import React from 'react';
import { Box } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';

const CARD_COUNT = 4;

/**
 * First-load placeholder for the Kids Wall feed: the same 2-column grid of post cards (square photo,
 * name line, title and text, like/star row), so nothing moves when the posts arrive.
 */
const KidsWallCardsSkeleton = () => (
  <SkeletonFrame label="Loading posts" sx={{ marginBottom: { xs: phoneFluid(20, 32), sm: '32px' } }}>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: { xs: phoneFluid(16, 24), sm: '24px' },
      }}
    >
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <Box key={index} sx={{ backgroundColor: themeColors.bgCard, overflow: 'hidden' }}>
          <Bone variant="rectangular" sx={{ width: '100%', aspectRatio: '1 / 1' }} />
          <Box sx={{ padding: { xs: phoneFluid(12, 16), sm: '16px' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Bone variant="circular" sx={{ width: 36, height: 36, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Bone sx={{ width: '40%', height: 16, marginBottom: '4px' }} />
                <Bone sx={{ width: '25%', height: 14 }} />
              </Box>
            </Box>
            <Bone sx={{ width: '70%', height: 22, marginBottom: '8px' }} />
            <Bone sx={{ width: '100%', height: 16, marginBottom: '4px' }} />
            <Bone sx={{ width: '85%', height: 16, marginBottom: '16px' }} />
            <Box sx={{ display: 'flex', gap: '8px' }}>
              <Bone sx={{ width: 48, height: 28 }} />
              <Bone sx={{ width: 88, height: 28 }} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  </SkeletonFrame>
);

export default KidsWallCardsSkeleton;
