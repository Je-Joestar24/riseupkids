import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { themeColors } from '../../../config/themeColors';
import { buildBunnyEmbedWatchUrl, looksLikeBunnyPlaybackEmbedUrl } from '../../../utils/bunnyExploreEmbed';
import { createBunnyPlayerBridge } from '../../../utils/bunnyPlayerBridge';

/** No sign of the embed after this long: show the error with Try again (the phone app does the same). */
export const BUNNY_EMBED_LOAD_TIMEOUT_MS = 15000;
/** How long the play / pause badge stays after a tap on the video (as in the phone app). */
export const BUNNY_PLAYBACK_HINT_MS = 1000;

const LOAD_ERROR_TEXT = 'The video could not load. Check your connection and try again.';

/**
 * A child watching a Bunny Stream embed, handled the way the phone app does it ("watch only"):
 *   - the video starts by itself, with sound;
 *   - once it is playing, the child cannot reach Bunny's own controls (seek, speed, settings, Bunny's full
 *     screen, picture in picture): a clear layer covers the video and a tap on it plays or pauses, with a small
 *     badge showing which;
 *   - a video that does not load shows the reason and a Try again button instead of a blank box.
 *
 * The cover layer only takes over after the embed has reported "playing" through its Player.js messages. If it
 * never does (autoplay refused by the browser, an older player, messages blocked) the layer is never put up, so
 * the child can still press Bunny's own play button and nothing is locked. Close, "I finished watching" and the
 * rest stay in the modal around it.
 *
 * Fills the (positioned) box it is placed in.
 */
const BunnyEmbedIframe = ({ embedUrl, title = 'Video', onLoad, onError, sx, preset = 'watchOnly' }) => {
  const iframeRef = useRef(null);
  const bridgeRef = useRef(null);
  const wallActiveRef = useRef(false);
  const playingRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wallActive, setWallActive] = useState(false);
  const [hint, setHint] = useState(null);

  const watchOnly = preset === 'watchOnly';
  const validEmbed = useMemo(
    () => (embedUrl && looksLikeBunnyPlaybackEmbedUrl(embedUrl) ? embedUrl.trim() : null),
    [embedUrl]
  );
  const src = useMemo(() => (validEmbed ? buildBunnyEmbedWatchUrl(validEmbed, { preset }) : null), [validEmbed, preset]);

  const fail = useCallback(() => {
    setFailed(true);
    onErrorRef.current?.();
  }, []);

  // A new video, or Try again: start from the beginning.
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setWallActive(false);
    setHint(null);
    wallActiveRef.current = false;
    playingRef.current = false;
  }, [src, reloadToken]);

  // The embed never showed up.
  useEffect(() => {
    if (!src || loaded || failed) return undefined;
    const timer = setTimeout(fail, BUNNY_EMBED_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [src, loaded, failed, reloadToken, fail]);

  const handleEvent = useCallback(
    ({ type, value }) => {
      if (type === 'ready') {
        bridgeRef.current?.play(); // the address asks for autoplay; this asks again now that the player can listen
        return;
      }
      if (type === 'play' || type === 'timeupdate') {
        const resumed = !playingRef.current && wallActiveRef.current;
        playingRef.current = true;
        if (resumed) setHint({ playing: true, token: Date.now() }); // also when a time update arrives before the play message
        wallActiveRef.current = true;
        setWallActive(true);
      } else if (type === 'pause') {
        playingRef.current = false;
        if (wallActiveRef.current) setHint({ playing: false, token: Date.now() });
      } else if (type === 'ended') {
        playingRef.current = false;
        if (wallActiveRef.current) setHint({ playing: false, token: Date.now() });
      } else if (type === 'error' && !(value && value.code)) {
        // A media failure carries no code. A command that failed does (code 5 = autoplay refused), and that only
        // means the child has to press play, so it is not shown as an error.
        fail();
      }
    },
    [fail]
  );

  // Messages with the embed (watch-only only).
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!watchOnly || !src || !iframe) return undefined;
    const bridge = createBunnyPlayerBridge(iframe, { onEvent: handleEvent });
    bridgeRef.current = bridge;
    return () => {
      bridge.destroy();
      bridgeRef.current = null;
    };
  }, [watchOnly, src, reloadToken, handleEvent]);

  // Behind the cover layer the embed can no longer be reached from the keyboard either.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (wallActive) iframe.setAttribute('inert', '');
    else iframe.removeAttribute('inert');
  }, [wallActive, reloadToken]);

  // "Playing" is a badge for a second; the paused play button stays until the video plays again.
  useEffect(() => {
    if (!hint?.playing) return undefined;
    const timer = setTimeout(() => setHint(null), BUNNY_PLAYBACK_HINT_MS);
    return () => clearTimeout(timer);
  }, [hint]);

  const togglePlayback = () => {
    if (playingRef.current) bridgeRef.current?.pause();
    else bridgeRef.current?.play();
  };

  if (!src) {
    return (
      <Box
        role="alert"
        sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, zIndex: 30 }}
      >
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: themeColors.error, textAlign: 'center' }}>
          No video is available here right now.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        component="iframe"
        key={`bunny-embed-${reloadToken}`}
        ref={iframeRef}
        src={src}
        title={`Bunny embed — ${title}`}
        // No `fullscreen` or `picture-in-picture`: the child watches inside the app's own frame (as in the phone app)
        allow={watchOnly ? 'accelerometer; gyroscope; autoplay; encrypted-media' : 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen'}
        allowFullScreen={!watchOnly}
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
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

      {watchOnly && wallActive && !failed ? (
        <Box
          component="button"
          type="button"
          onClick={togglePlayback}
          aria-label={`Play or pause ${title}`}
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            width: '100%',
            height: '100%',
            m: 0,
            p: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            '&:focus-visible': { outline: `3px solid ${themeColors.secondary}`, outlineOffset: '-3px' },
          }}
        />
      ) : null}

      {watchOnly && hint ? (
        <Box
          role="status"
          aria-label={hint.playing ? 'Playing' : 'Paused'}
          sx={{ position: 'absolute', inset: 0, zIndex: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
        >
          <Box
            sx={{
              width: hint.playing ? 76 : 92,
              height: hint.playing ? 76 : 92,
              borderRadius: '50%',
              backgroundColor: themeColors.orange,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
            }}
          >
            {hint.playing ? <PauseIcon sx={{ fontSize: 40 }} /> : <PlayArrowIcon sx={{ fontSize: 56 }} />}
          </Box>
        </Box>
      ) : null}

      {failed ? (
        <Box
          role="alert"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            p: 3,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }}
        >
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, color: themeColors.error, textAlign: 'center' }}>
            {LOAD_ERROR_TEXT}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setReloadToken((token) => token + 1)}
            sx={{
              backgroundColor: themeColors.secondary,
              color: themeColors.textInverse,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { backgroundColor: themeColors.primary },
            }}
          >
            Try again
          </Button>
        </Box>
      ) : null}
    </>
  );
};

export default BunnyEmbedIframe;
