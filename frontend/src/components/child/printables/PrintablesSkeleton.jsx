import React from 'react';
import { Box } from '@mui/material';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';

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
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Bone variant="rectangular" sx={{ flexShrink: 0, width: 128, height: 128 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Bone sx={{ width: '60%', height: 32, marginBottom: '8px' }} />
          <Bone sx={{ width: '85%', height: 22 }} />
        </Box>
        <Bone variant="rectangular" sx={{ flexShrink: 0, width: 150, height: 56 }} />
      </Box>
    ))}
  </SkeletonFrame>
);

export default PrintablesSkeleton;
