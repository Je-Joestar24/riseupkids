import React, { useCallback, useEffect, useRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import {
  cmsPageSubtitleTextSx,
  cmsPageSubtitleWrapSx,
  imageActionButtonSx,
  pageFrameSx,
  resolveImageUrl,
  resolveRewardAudioUrl,
  resolveVideoUrl,
} from './shared';

const RewardTest = ({
  page,
  isPreloading = false,
  homeIconUrl = '',
  isFinalizing = false,
  onHome,
}) => {
  const bgImage = resolveImageUrl(page);
  const videoUrl = resolveVideoUrl(page);
  const rewardAudioUrl = resolveRewardAudioUrl(page);
  const audioRef = useRef(null);

  const stopRewardAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    audioRef.current = null;
  }, []);

  useEffect(() => {
    if (!rewardAudioUrl || isPreloading) {
      stopRewardAudio();
      return undefined;
    }

    const audio = new Audio(rewardAudioUrl);
    audio.preload = 'auto';
    audio.setAttribute('aria-hidden', 'true');
    audioRef.current = audio;

    const tryPlay = () => {
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      tryPlay();
    } else {
      audio.addEventListener('canplaythrough', tryPlay, { once: true });
    }

    return () => {
      audio.removeEventListener('canplaythrough', tryPlay);
      stopRewardAudio();
    };
  }, [isPreloading, rewardAudioUrl, stopRewardAudio]);

  const handleHome = () => {
    stopRewardAudio();
    onHome?.();
  };

  return (
    <Box sx={pageFrameSx} role="region" aria-label={page?.title || 'Reward page'}>
      {bgImage ? (
        <Box
          component="img"
          src={bgImage}
          alt={page?.title || 'Reward preview'}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
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
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
        />
      ) : null}

      {page?.subtitle ? (
        <Box sx={cmsPageSubtitleWrapSx}>
          <Typography sx={cmsPageSubtitleTextSx}>{page.subtitle}</Typography>
        </Box>
      ) : null}

      {homeIconUrl && onHome ? (
        <IconButton
          onClick={handleHome}
          disabled={isPreloading || isFinalizing}
          aria-label="Go home and finish book"
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
          <img src={homeIconUrl} alt="Home button" />
        </IconButton>
      ) : null}
    </Box>
  );
};

export default RewardTest;
