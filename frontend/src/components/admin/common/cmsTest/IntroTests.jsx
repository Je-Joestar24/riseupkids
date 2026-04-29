import React from 'react';
import { Box, IconButton } from '@mui/material';
import introPlayButtonImage from '../../../../assets/images/book/intro_play_button.png';
import {
  imageActionButtonSx,
  pageFrameSx,
  resolveImageUrl,
} from './shared';

const IntroTests = ({
  page,
  hasNext,
  isPreloading,
  onNext,
}) => {
  const bgImage = resolveImageUrl(page);

  return (
    <Box sx={pageFrameSx}>
      {bgImage ? (
        <Box
          component="img"
          src={bgImage}
          alt={page?.title || 'Intro preview'}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      <IconButton
        onClick={onNext}
        disabled={isPreloading || !hasNext}
        aria-label="Play intro and continue"
        sx={{
          ...imageActionButtonSx,
          position: 'absolute',
          left: '50%',
          bottom: { xs: 52, md: 66 },
          transform: 'translateX(-50%)',
        }}
      >
        <img src={introPlayButtonImage} alt="Intro play button" />
      </IconButton>
    </Box>
  );
};

export default IntroTests;
