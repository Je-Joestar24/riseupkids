import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  PlayArrow as PlayArrowIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import { BACKEND_BASE_URL } from '../../../config/constants';
import { looksLikeBunnyExploreEmbedUrl } from '../../../utils/bunnyExploreEmbed';
import AdminTestHtmlModal from './AdminTestHtmlModal';
import CmsBooksModalTest from './CmsBooksModalTest';
import useCmsBookPlayer from '../../../hooks/cmsBookPlayer';
import cmsBookAdminService from '../../../services/cmsBookAdminService';

const resolveMediaUrl = (maybeUrl) => {
  if (!maybeUrl || typeof maybeUrl !== 'string') return '';
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  return `${BACKEND_BASE_URL}${maybeUrl.startsWith('/') ? maybeUrl : `/${maybeUrl}`}`;
};

const getVideoSource = (video) => {
  if (!video) return '';
  const raw =
    video.embedUrl ||
    video.cloudUrl ||
    video.url ||
    video.videoFileUrl ||
    video.videoFile?.url ||
    video.filePath ||
    '';
  return resolveMediaUrl(raw);
};

const isBunnyEmbedVideo = (video, videoSrc) => {
  if (!video) return false;
  if (video.videoSource === 'embed') return true;
  return looksLikeBunnyExploreEmbedUrl(videoSrc || video.embedUrl || video.url || '');
};

const getCmsBookId = (video) => {
  const raw = video?.cmsBookId || video?.cmsBook;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw && typeof raw === 'object') {
    return raw._id || raw.id || null;
  }
  return null;
};

const getFollowUpMeta = (video) => {
  const completionType = String(video?.completionContentType || 'none').toLowerCase();
  if (completionType === 'html5' && video?.html5PackageId) {
    return {
      type: 'html5',
      label: 'HTML5 package',
      buttonLabel: 'Continue to HTML5',
    };
  }
  if (completionType === 'builtin' && getCmsBookId(video)) {
    return {
      type: 'builtin',
      label: 'Built-in CMS book',
      buttonLabel: 'Continue to CMS Book',
    };
  }
  if (completionType === 'scorm') {
    return {
      type: 'legacy-scorm',
      label: 'Legacy SCORM follow-up',
      buttonLabel: 'Legacy SCORM',
    };
  }
  return {
    type: 'none',
    label: 'No follow-up activity',
    buttonLabel: '',
  };
};

export default function AdminVideoTester({ open, onClose, video }) {
  const theme = useTheme();
  const videoRef = useRef(null);
  const [playbackError, setPlaybackError] = useState('');
  const [videoEnded, setVideoEnded] = useState(false);
  const [html5Open, setHtml5Open] = useState(false);
  const [cmsOpen, setCmsOpen] = useState(false);
  const [cmsPages, setCmsPages] = useState([]);
  const [cmsLoading, setCmsLoading] = useState(false);

  const {
    loadPlayableBookById,
    preloadBookMedia,
    clearPreloadState,
    preloadProgress,
    preloadSummary,
    loading: cmsPlayerLoading,
  } = useCmsBookPlayer();

  const videoSrc = useMemo(() => getVideoSource(video), [video]);
  const isEmbed = useMemo(() => isBunnyEmbedVideo(video, videoSrc), [video, videoSrc]);
  const followUp = useMemo(() => getFollowUpMeta(video), [video]);
  const title = video?.title?.trim() || 'Video preview';
  const hasFollowUp = followUp.type === 'html5' || followUp.type === 'builtin';

  const resetLocalState = useCallback(() => {
    setPlaybackError('');
    setVideoEnded(false);
    setHtml5Open(false);
    setCmsOpen(false);
    setCmsPages([]);
    setCmsLoading(false);
    clearPreloadState();
  }, [clearPreloadState]);

  useEffect(() => {
    if (!open) {
      const el = videoRef.current;
      if (el) {
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
      resetLocalState();
      return;
    }
    setPlaybackError('');
    setVideoEnded(false);
  }, [open, video?._id, videoSrc, resetLocalState]);

  const handleClose = () => {
    resetLocalState();
    onClose?.();
  };

  const handleOpenInNewTab = () => {
    if (videoSrc) window.open(videoSrc, '_blank', 'noopener,noreferrer');
  };

  const handleReplay = () => {
    setVideoEnded(false);
    setPlaybackError('');
    if (!isEmbed && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleOpenCmsFollowUp = async () => {
    const cmsBookId = getCmsBookId(video);
    if (!cmsBookId) {
      setPlaybackError('No built-in CMS book is linked to this video.');
      return;
    }

    setCmsLoading(true);
    clearPreloadState();
    try {
      let pages = [];
      let playableBook = null;
      try {
        const playableResponse = await loadPlayableBookById(cmsBookId);
        playableBook = playableResponse?.data || null;
        pages = Array.isArray(playableBook?.pages) ? playableBook.pages : [];
      } catch (_playableError) {
        const response = await cmsBookAdminService.getBookById(cmsBookId);
        pages = Array.isArray(response?.data?.pages) ? response.data.pages : [];
      }

      setCmsPages(pages);
      const preloadPromise = pages.length > 0
        ? preloadBookMedia({ bookId: cmsBookId, pages, book: playableBook })
        : null;
      setCmsOpen(true);
      if (preloadPromise) {
        await preloadPromise;
      }
    } catch (error) {
      console.error('Failed to load video CMS follow-up for testing:', error);
      setPlaybackError('Failed to load the linked built-in CMS book.');
    } finally {
      setCmsLoading(false);
    }
  };

  const handleOpenFollowUp = async () => {
    if (followUp.type === 'html5') {
      setHtml5Open(true);
      return;
    }
    if (followUp.type === 'builtin') {
      await handleOpenCmsFollowUp();
    }
  };

  return (
    <>
      <Dialog
        open={Boolean(open) && !html5Open && !cmsOpen}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        scroll="body"
        aria-labelledby="admin-video-tester-title"
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: '18px',
            fontFamily: 'Quicksand, sans-serif',
            width: 'min(1180px, calc(100vw - 32px))',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box>
            <Typography
              id="admin-video-tester-title"
              variant="h6"
              sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800 }}
            >
              Test video playback
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 0.75 }}>
              <Chip
                size="small"
                label={isEmbed ? 'Bunny embed' : 'Uploaded video'}
                color={isEmbed ? 'info' : 'primary'}
                sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={followUp.label}
                color={hasFollowUp ? 'success' : followUp.type === 'legacy-scorm' ? 'warning' : 'default'}
                sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
              />
            </Stack>
          </Box>
          <IconButton onClick={handleClose} aria-label="Close video tester" edge="end" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}
          >
            {title}
          </Typography>

          {!videoSrc ? (
            <Alert severity="warning" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              No playable video URL is available. Refresh the content list after the upload finishes.
            </Alert>
          ) : null}

          {playbackError ? (
            <Alert severity="error" sx={{ mb: 2, fontFamily: 'Quicksand, sans-serif' }}>
              {playbackError}
            </Alert>
          ) : null}

          {videoSrc ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                bgcolor: 'common.black',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
              }}
            >
              {isEmbed ? (
                <Box
                  component="iframe"
                  key={videoSrc}
                  src={videoSrc}
                  title={`Bunny video test - ${title}`}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                  }}
                  aria-label={`Bunny embed test playback for ${title}`}
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
                  onEnded={() => setVideoEnded(true)}
                  onError={() =>
                    setPlaybackError(
                      'Playback failed. Confirm the upload finished and the URL can be reached from this browser.'
                    )
                  }
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                  aria-label={`Test playback for ${title}`}
                />
              )}

              {videoEnded && hasFollowUp ? (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.66)',
                    p: 3,
                  }}
                >
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <Typography
                      variant="h5"
                      sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800, color: 'common.white' }}
                    >
                      Video finished
                    </Typography>
                    <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: 'common.white' }}>
                      Continue testing the linked {followUp.label}.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleOpenFollowUp}
                      disabled={cmsLoading}
                      sx={{ borderRadius: '12px', fontFamily: 'Quicksand, sans-serif', fontWeight: 800 }}
                    >
                      {cmsLoading ? 'Preparing...' : followUp.buttonLabel}
                    </Button>
                  </Stack>
                </Box>
              ) : null}
            </Box>
          ) : null}

          {followUp.type === 'legacy-scorm' ? (
            <Alert severity="warning" sx={{ mt: 2, fontFamily: 'Quicksand, sans-serif' }}>
              This video has a legacy SCORM follow-up. The current tester focuses on uploaded videos, Bunny embeds,
              HTML5 packages, and built-in CMS books.
            </Alert>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={handleClose} sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
            Close
          </Button>
{/*           {videoSrc ? (
            <Button
              startIcon={<OpenInNewIcon />}
              onClick={handleOpenInNewTab}
              variant="outlined"
              sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
            >
              Open video URL
            </Button>
          ) : null} */}
          {!isEmbed && videoSrc ? (
            <Button
              startIcon={<ReplayIcon />}
              onClick={handleReplay}
              variant="outlined"
              sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
            >
              Replay
            </Button>
          ) : null}
          {hasFollowUp ? (
            <Button
              startIcon={cmsLoading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
              onClick={handleOpenFollowUp}
              variant="contained"
              disabled={cmsLoading}
              sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800 }}
            >
              {cmsLoading ? 'Preparing follow-up...' : `Test ${followUp.label}`}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <AdminTestHtmlModal
        open={html5Open}
        onClose={() => setHtml5Open(false)}
        contentId={video?._id}
        contentTitle={title}
        html5PackageId={video?.html5PackageId}
        html5EntryPoint={video?.html5EntryPoint || 'index.html'}
      />

      <CmsBooksModalTest
        open={cmsOpen}
        onClose={() => {
          setCmsOpen(false);
          setCmsPages([]);
          clearPreloadState();
        }}
        pages={cmsPages}
        isPreloading={Boolean(cmsPlayerLoading?.preload)}
        preloadProgress={preloadProgress}
        preloadSummary={preloadSummary}
      />
    </>
  );
}
