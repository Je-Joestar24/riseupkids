import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { EXPERIENCE_COLORS, withAutoplay } from '../../../utils/experienceChildFormat';
import BunnyEmbedIframe from '../common/BunnyEmbedIframe';

const { cream: CREAM, ink: INK, orange: ORANGE, primary: PRIMARY } = EXPERIENCE_COLORS;

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

/**
 * One video: a play button first, and the Bunny player only after it is tapped, so nothing loads until the child wants
 * it (as in the phone app). A video with no usable link shows the same play button, but it cannot be pressed.
 *
 * The frame is 16:9 and as wide as its band, so on a 320px phone it is a full-width screen and on a computer it grows to
 * the band's 900px; nothing inside it has a fixed width.
 */
const ExperienceVideoBlock = ({ video, playing, onPlay }) => {
  const poster = (
    <>
      <Box
        sx={{
          width: { xs: phoneFluid(52, 62), sm: '62px' },
          height: { xs: phoneFluid(52, 62), sm: '62px' },
          p: { xs: phoneFluid(9, 10), sm: '10px' },
          borderRadius: '50%',
          backgroundColor: ORANGE,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PlayIcon />
      </Box>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: { xs: phoneFluid(14, 15), sm: '15px' },
          color: INK,
          textAlign: 'center',
          overflowWrap: 'anywhere',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {video.title}
      </Typography>
    </>
  );

  const posterSx = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    p: { xs: '12px', sm: '16px' },
  };

  let content;
  if (video.playable && playing) {
    content = <BunnyEmbedIframe embedUrl={withAutoplay(video.url)} title={video.title} preset="default" />;
  } else if (video.playable) {
    content = (
      <ButtonBase onClick={onPlay} aria-label={`Play ${video.title}`} sx={{ ...posterSx, '&.Mui-focusVisible': { outline: `3px solid ${ORANGE}`, outlineOffset: '-3px' } }}>
        {poster}
      </ButtonBase>
    );
  } else {
    content = (
      <Box role="img" aria-label={video.title} sx={posterSx}>
        {poster}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#fff',
        border: `2px solid ${PRIMARY}`,
        borderRadius: { xs: '16px', sm: '20px' },
        p: '4px',
        boxShadow: '0 10px 14px rgba(62, 127, 118, 0.16)',
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: { xs: '12px', sm: '16px' }, overflow: 'hidden', backgroundColor: CREAM }}>
        {content}
      </Box>
    </Box>
  );
};

export default ExperienceVideoBlock;
