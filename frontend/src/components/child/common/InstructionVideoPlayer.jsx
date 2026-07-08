import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { BACKEND_BASE_URL } from '../../../config/constants';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';
import { resolveInstructionVideoPlayback } from '../../../utils/instructionVideoPlayback';
import BunnyEmbedIframe from './BunnyEmbedIframe';

const buildPublicUrl = (maybeUrl) => {
  if (!maybeUrl) return null;
  const urlStr = typeof maybeUrl === 'string' ? maybeUrl : maybeUrl?.url || '';
  if (!urlStr) return null;
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr;
  return `${BACKEND_BASE_URL}${urlStr.startsWith('/') ? urlStr : `/${urlStr}`}`;
};

const mediaShellSx = {
  width: '100%',
  borderRadius: '14px',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
};

/**
 * Instruction media for audio assignments and chants.
 * Shows instruction video (16:9) when available; otherwise a square cover image (app parity).
 */
const InstructionVideoPlayer = ({
  media,
  coverImage = null,
  title = 'Instruction video',
  autoPlayMutedLoop = true,
  compactCover = false,
}) => {
  const playback = useMemo(
    () => resolveInstructionVideoPlayback(media, buildPublicUrl),
    [media]
  );

  const coverImageUrl = useMemo(() => {
    const raw =
      typeof coverImage === 'string'
        ? coverImage
        : coverImage?.url || coverImage?.cloudUrl || null;
    return getCoverImageUrl(raw);
  }, [coverImage]);

  if (playback.url) {
    return (
      <Box
        sx={{
          ...mediaShellSx,
          backgroundColor: '#000',
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
  }

  if (!coverImageUrl) return null;

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        boxShadow: compactCover ? 'none' : '0 10px 30px rgba(0,0,0,0.12)',
        backgroundColor: '#f0f0f0',
        maxWidth: compactCover ? { xs: 168, sm: 200 } : '100%',
        mx: compactCover ? 'auto' : 0,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: compactCover ? '1 / 1' : '1 / 1',
          maxHeight: compactCover ? { xs: 168, sm: 200 } : 'none',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Box
          component="img"
          src={coverImageUrl}
          alt={title}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
};

export default InstructionVideoPlayer;
