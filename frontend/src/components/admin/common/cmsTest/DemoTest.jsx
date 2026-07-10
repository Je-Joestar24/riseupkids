import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import demoPlayButtonImage from '../../../../assets/images/book/demo_play_button.png';
import { useMediaLoadRecovery } from '../../../../utils/cmsMediaPlayback';
import {
  cmsPageSubtitleTextSx,
  cmsPageSubtitleWrapSx,
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
  const { src: videoSrc, onMediaError: onVideoError } = useMediaLoadRecovery(videoUrl);

  return (
    <Box sx={pageFrameSx}>
      {bgImage ? (
        <Box
          component="img"
          src={bgImage}
          alt={page?.title || 'Demo preview'}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        />
      ) : null}

      {videoSrc ? (
        <Box
          component="video"
          key={videoSrc}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Demo video preview"
          onError={onVideoError}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
        />
      ) : null}

      {page?.subtitle ? (
        <Box sx={cmsPageSubtitleWrapSx}>
          <Typography sx={cmsPageSubtitleTextSx}>{page.subtitle}</Typography>
        </Box>
      ) : null}

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
          zIndex: 30,
        }}
      >
        <img src={demoPlayButtonImage} alt="Demo play button" />
      </IconButton>
    </Box>
  );
};

export default DemoTest;
