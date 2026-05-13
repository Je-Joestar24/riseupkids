import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useExplore } from '../../../../hooks/exploreHook';
import { looksLikeBunnyExploreEmbedUrl } from '../../../../utils/bunnyExploreEmbed';

/**
 * Resolve playable URL for admin explore list items (lean + populated shapes).
 * For Bunny embeds this is the iframe page URL (use iframe, not <video>).
 * @param {object|null} content
 * @param {(raw: string) => string|null} getVideoFileUrl
 * @returns {string|null}
 */
export function resolveExploreAdminVideoSrc(content, getVideoFileUrl) {
  if (!content || typeof getVideoFileUrl !== 'function') return null;
  const raw = content.videoFileUrl || content.videoFile?.url;
  if (!raw) return null;
  return getVideoFileUrl(raw);
}

/**
 * True when this explore row should use Bunny iframe embed playback.
 * @param {object|null} content
 */
export function isExploreAdminBunnyEmbed(content) {
  if (!content) return false;
  if (content.videoFile?.videoSource === 'embed') return true;
  const raw = content.videoFileUrl || content.videoFile?.url;
  return typeof raw === 'string' && looksLikeBunnyExploreEmbedUrl(raw);
}

/**
 * Modal admin test player: uploaded file uses &lt;video&gt;; Bunny embed uses &lt;iframe&gt;.
 */
const ExploreVideoTestPlayerModal = ({ open, onClose, content }) => {
  const theme = useTheme();
  const { getVideoFileUrl, getVideoTypeLabel } = useExplore();
  const videoRef = useRef(null);
  const [playbackError, setPlaybackError] = useState(null);

  const videoSrc = useMemo(
    () => resolveExploreAdminVideoSrc(content, getVideoFileUrl),
    [content, getVideoFileUrl]
  );

  const isEmbed = useMemo(() => isExploreAdminBunnyEmbed(content), [content]);

  const displayTitle = content?.title?.trim() || 'Explore video';

  useEffect(() => {
    if (!open) {
      setPlaybackError(null);
      const el = videoRef.current;
      if (el) {
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
    }
  }, [open]);

  useEffect(() => {
    setPlaybackError(null);
  }, [content?._id, videoSrc, isEmbed]);

  const handleVideoError = () => {
    setPlaybackError(
      'Playback failed. Confirm the file finished uploading, the URL is reachable, and CORS allows your admin origin if required.'
    );
  };

  const handleIframeError = () => {
    setPlaybackError(
      'The embed could not load in this frame. Try Open in new tab, or check Bunny Stream / browser settings.'
    );
  };

  const handleOpenInNewTab = () => {
    if (videoSrc) window.open(videoSrc, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="body"
      aria-labelledby="explore-video-test-player-title"
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '16px',
          fontFamily: 'Quicksand, sans-serif',
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box>
          <Typography
            id="explore-video-test-player-title"
            variant="h6"
            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, display: 'block' }}
          >
            Test playback
          </Typography>
          {content?.videoType ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: 'Quicksand, sans-serif', mt: 0.25, display: 'block' }}
            >
              {getVideoTypeLabel(content.videoType)}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={onClose} aria-label="Close video test dialog" edge="end" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, fontFamily: 'Quicksand, sans-serif' }}
        >
          {displayTitle}
        </Typography>
        {!videoSrc ? (
          <Alert severity="warning" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            No video URL is available for this item. If you just created it, refresh the list after the upload
            completes.
          </Alert>
        ) : null}
        {playbackError ? (
          <Alert severity="error" sx={{ mb: 2, fontFamily: 'Quicksand, sans-serif' }} role="alert">
            {playbackError}
          </Alert>
        ) : null}
        {videoSrc ? (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              pt: '56.25%',
              bgcolor: 'common.black',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {isEmbed ? (
              <Box
                component="iframe"
                key={videoSrc}
                src={videoSrc}
                title={`Bunny embed — ${displayTitle}`}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                onError={handleIframeError}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
                aria-label={`Bunny embed test playback for ${displayTitle}`}
              />
            ) : (
              <Box
                component="video"
                ref={videoRef}
                key={videoSrc}
                src={videoSrc}
                controls
                playsInline
                preload="metadata"
                onError={handleVideoError}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                aria-label={`Test playback for ${displayTitle}`}
              />
            )}
          </Box>
        ) : null}
        {isEmbed && videoSrc ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            Bunny Stream embed (iframe)
          </Typography>
        ) : content?.videoFile?.mimeType ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            {content.videoFile.mimeType}
            {typeof content.videoFile.size === 'number' && content.videoFile.size > 0
              ? ` · ${(content.videoFile.size / (1024 * 1024)).toFixed(1)} MB`
              : ''}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
          Close
        </Button>
        {videoSrc ? (
          <Button
            startIcon={<OpenInNewIcon aria-hidden />}
            onClick={handleOpenInNewTab}
            variant="outlined"
            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}
            aria-label="Open media URL in new tab"
          >
            Open in new tab
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

export default ExploreVideoTestPlayerModal;
