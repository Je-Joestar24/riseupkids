import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { looksLikeBunnyExploreEmbedUrl } from '../../../utils/bunnyExploreEmbed';

/**
 * Bunny Stream embed iframe for child-facing web playback.
 */
const BunnyEmbedIframe = ({
  embedUrl,
  title = 'Video',
  onLoad,
  onError,
  sx,
}) => {
  const validEmbed = useMemo(
    () => (embedUrl && looksLikeBunnyExploreEmbedUrl(embedUrl) ? embedUrl.trim() : null),
    [embedUrl]
  );

  if (!validEmbed) return null;

  return (
    <Box
      component="iframe"
      src={validEmbed}
      title={`Bunny embed — ${title}`}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      onLoad={onLoad}
      onError={onError}
      aria-label={`Bunny embed playback for ${title}`}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 0,
        ...sx,
      }}
    />
  );
};

export default BunnyEmbedIframe;
