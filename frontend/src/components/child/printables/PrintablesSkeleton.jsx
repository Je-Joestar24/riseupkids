import React from 'react';
import { Box } from '@mui/material';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';
import { phoneFluid } from '../../../constants/childPhoneLayout';

const CARD_COUNT = 3;

/**
 * First-load placeholder for the printables list: the same white cards as the real ones (square picture,
 * title and description, Download button), so nothing moves when the printables arrive. The page header
 * and footer stay on screen.
 */
const PrintablesSkeleton = () => (
  <SkeletonFrame
    label="Loading printables"
    sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 4 } }}
  >
    {Array.from({ length: CARD_COUNT }, (_, index) => (
      <Box
        key={index}
        sx={{
          backgroundColor: 'white',
          boxShadow: '0 12px 28px rgba(0,0,0,0.10)',
          p: { xs: phoneFluid(14, 24), sm: 3 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: phoneFluid(12, 24), sm: 3 },
        }}
      >
        <Bone
          variant="rectangular"
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 128 }, height: { xs: 'auto', sm: 128 }, aspectRatio: { xs: '4 / 3', sm: 'auto' } }}
        />
        <Box sx={{ flexGrow: 1 }}>
          <Bone sx={{ width: '60%', height: 32, marginBottom: '8px' }} />
          <Bone sx={{ width: '85%', height: 22 }} />
        </Box>
        <Bone variant="rectangular" sx={{ flexShrink: 0, width: { xs: '100%', sm: 150 }, height: 56 }} />
      </Box>
    ))}
  </SkeletonFrame>
);

export default PrintablesSkeleton;
