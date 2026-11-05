import React from 'react';
import { Box } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';
import { phoneFluid } from '../../../constants/childPhoneLayout';

const SECTION_COUNT = 2;
const CARDS_PER_SECTION = 3;

/**
 * First-load placeholder for a course page: square cover, progress card, then rows of square cards
 * for the content sections, in the same sizes as the real page.
 */
const ChildModuleSkeleton = () => (
  <SkeletonFrame label="Loading the course" sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <Bone variant="rectangular" sx={{ width: '100%', aspectRatio: '1 / 1', marginTop: '20px' }} />

    <Box sx={{ width: '100%', paddingX: { xs: 0, sm: '32px' } }}>
      <Box
        sx={{
          width: '100%',
          padding: { xs: phoneFluid(18, 32), sm: '32px' },
          backgroundColor: themeColors.textInverse,
          borderRadius: '24px',
          marginTop: '32px',
        }}
      >
        <Bone sx={{ width: '60%', height: 44, marginBottom: '12px' }} />
        <Bone sx={{ width: '90%', height: 26, marginBottom: '24px' }} />
        <Bone sx={{ width: '100%', height: 16 }} />
      </Box>

      {Array.from({ length: SECTION_COUNT }, (_, section) => (
        <Box key={section} sx={{ marginTop: '32px' }}>
          <Bone sx={{ width: 180, height: 32, marginBottom: '16px' }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: { xs: '16px 4%', sm: '24px' },
            }}
          >
            {Array.from({ length: CARDS_PER_SECTION }, (_, card) => (
              <Bone key={card} variant="rectangular" sx={{ width: '100%', aspectRatio: '1 / 1' }} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  </SkeletonFrame>
);

export default ChildModuleSkeleton;
