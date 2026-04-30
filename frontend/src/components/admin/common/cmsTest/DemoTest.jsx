import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import demoPlayButtonImage from '../../../../assets/images/book/demo_play_button.png';
import {
  imageActionButtonSx,
  pageFrameSx,
  resolveImageUrl,
  resolveVideoUrl,
} from './shared';

const DemoTest = ({
  page,
  hasNext,
  isPreloading,
  onNext,
}) => {
  const bgImage = resolveImageUrl(page);
  const videoUrl = resolveVideoUrl(page);

  return (
    <Box sx={pageFrameSx}>
      {bgImage ? (
        <Box
          component="img"
          src={bgImage}
          alt={page?.title || 'Demo preview'}
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
          aria-label="Demo video preview"
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

      <IconButton
        onClick={onNext}
        disabled={isPreloading || !hasNext}
        aria-label="Play demo and continue to interactive"
        sx={{
          ...imageActionButtonSx,
          position: 'absolute',
          right: '0.9375%',
          bottom: '5.1852%',
          width: '7.5%',
          aspectRatio: '1 / 1',
        }}
      >
        <img src={demoPlayButtonImage} alt="Demo play button" />
      </IconButton>
    </Box>
  );
};

export default DemoTest;
