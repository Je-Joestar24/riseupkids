import React, { useCallback, useEffect, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import introPlayButtonImage from '../../../../assets/images/book/intro_play_button.png';
import { useCmsMediaResolver } from '../../../../hooks/cmsMediaSrc';
import CmsNextButtonWait, { lockedNextButtonSx } from './CmsNextButtonWait';
import {
  imageActionButtonSx,
  pageFrameSx,
  resolveImageUrl,
  resolveIntroBackgroundMusicUrl,
} from './shared';

const IntroTests = ({
  page,
  hasNext,
  isPreloading,
  nextLocked = false,
  onNext,
}) => {
  const bgImage = resolveImageUrl(page);
  const backgroundMusicUrl = resolveIntroBackgroundMusicUrl(page);
  const resolveMediaSrc = useCmsMediaResolver();
  const audioRef = useRef(null);

  const stopBackgroundMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
    audio.src = '';
    audioRef.current = null;
  }, []);

  useEffect(() => {
    if (!backgroundMusicUrl || isPreloading) {
      stopBackgroundMusic();
      return undefined;
    }

    const audio = new Audio(resolveMediaSrc(backgroundMusicUrl));
    audio.loop = true;
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
      stopBackgroundMusic();
    };
  }, [backgroundMusicUrl, isPreloading, stopBackgroundMusic, resolveMediaSrc]);

  const handleNext = () => {
    stopBackgroundMusic();
    onNext?.();
  };

  return (
    <Box sx={pageFrameSx} role="region" aria-label={page?.title || 'Intro page'}>
      {bgImage ? (
        <Box
          component="img"
          src={bgImage}
          alt={page?.title || 'Intro preview'}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      <IconButton
        onClick={handleNext}
        disabled={isPreloading || !hasNext || nextLocked}
        aria-label="Play intro and continue"
        aria-busy={nextLocked || undefined}
        sx={{
          ...imageActionButtonSx,
          position: 'absolute',
          left: '50%',
          bottom: '6.1111%',
          width: '7.5%',
          aspectRatio: '1 / 1',
          transform: 'translateX(-50%)',
          ...lockedNextButtonSx(nextLocked),
        }}
      >
        <img src={introPlayButtonImage} alt="Intro play button" />
        {nextLocked ? <CmsNextButtonWait /> : null}
      </IconButton>
    </Box>
  );
};

export default IntroTests;
