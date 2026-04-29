import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  pageFrameSx,
  resolveImageUrl,
  resolveVideoUrl,
} from './shared';

const RewardTest = ({
  page,
}) => {
  const bgImage = resolveImageUrl(page);
  const videoUrl = resolveVideoUrl(page);

  return (
    <Box sx={pageFrameSx}>
      {bgImage ? (
        <Box
          component="img"
          src={bgImage}
          alt={page?.title || 'Reward preview'}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      {videoUrl ? (
        <Box
          component="video"
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          aria-label="Reward video preview"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, md: 3 },
          background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.38))',
        }}
      >
        <Box sx={{ mt: 1, textAlign: 'center', color: 'common.white' }}>
          {page?.subtitle ? (
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', opacity: 0.95 }}>
              {page.subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>

    </Box>
  );
};

export default RewardTest;
