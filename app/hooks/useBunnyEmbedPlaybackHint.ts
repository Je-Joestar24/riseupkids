import { useCallback, useEffect, useState } from 'react';

import { BUNNY_EMBED_PLAYBACK_HINT_MS } from '@/utils/bunnyEmbedPlayScript';

export interface BunnyEmbedPlaybackHint {
  playing: boolean;
  token: number;
}

export function useBunnyEmbedPlaybackHint(hideMs: number = BUNNY_EMBED_PLAYBACK_HINT_MS) {
  const [hint, setHint] = useState<BunnyEmbedPlaybackHint | null>(null);

  const showHint = useCallback((playing: boolean) => {
    setHint({ playing, token: Date.now() });
  }, []);

  const clearHint = useCallback(() => {
    setHint(null);
  }, []);

  useEffect(() => {
    if (!hint) return undefined;
    const timer = setTimeout(() => {
      setHint(null);
    }, hideMs);
    return () => clearTimeout(timer);
  }, [hint, hideMs]);

  return { hint, showHint, clearHint };
}
