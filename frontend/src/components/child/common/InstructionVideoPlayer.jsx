import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { BACKEND_BASE_URL } from '../../../config/constants';
import { resolveInstructionVideoPlayback } from '../../../utils/instructionVideoPlayback';
import BunnyEmbedIframe from './BunnyEmbedIframe';

const buildPublicUrl = (maybeUrl) => {
  if (!maybeUrl) return null;
  const urlStr = typeof maybeUrl === 'string' ? maybeUrl : maybeUrl?.url || '';
  if (!urlStr) return null;
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr;
  return `${BACKEND_BASE_URL}${urlStr.startsWith('/') ? urlStr : `/${urlStr}`}`;
};

/**
 * Instruction video for audio assignments and chants.
 * Routes Bunny embed (iframe) vs uploaded file (HTML5 video).
 */
const InstructionVideoPlayer = ({
  media,
  title = 'Instruction video',
  autoPlayMutedLoop = true,
}) => {
  const playback = useMemo(
    () => resolveInstructionVideoPlayback(media, buildPublicUrl),
    [media]
  );

  if (!playback.url) return null;

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        backgroundColor: '#000',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#000',
        }}
      >
        {playback.mode === 'embed' ? (
          <BunnyEmbedIframe embedUrl={playback.url} title={title} />
        ) : (
          <Box
            component="video"
            src={playback.url}
            controls
            playsInline
            preload="metadata"
            autoPlay={autoPlayMutedLoop}
            muted={autoPlayMutedLoop}
            loop={autoPlayMutedLoop}
            aria-label={title}
            sx={{
              width: '100%',
              height: '100%',
              display: 'block',
              backgroundColor: '#000',
              objectFit: 'contain',
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default InstructionVideoPlayer;
