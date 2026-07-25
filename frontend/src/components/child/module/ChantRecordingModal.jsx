import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  MusicNote as MusicNoteIcon,
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { updateChildStats } from '../../../store/slices/userSlice';
import { themeColors } from '../../../config/themeColors';
import chantProgressService from '../../../services/chantProgressService';
import courseProgressService from '../../../services/courseProgressService';
import { BACKEND_BASE_URL } from '../../../config/constants';
import InstructionVideoPlayer from '../common/InstructionVideoPlayer';
import { resolveInstructionVideoPlayback } from '../../../utils/instructionVideoPlayback';
import { getChantCompletionLabels } from '../../../utils/chantCompletionLabels';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';

const buildPublicUrl = (maybeUrl) => {
  if (!maybeUrl) return null;
  const urlStr = typeof maybeUrl === 'string' ? maybeUrl : maybeUrl?.url || '';
  if (!urlStr) return null;
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr;
  return `${BACKEND_BASE_URL}${urlStr.startsWith('/') ? urlStr : `/${urlStr}`}`;
};

const ConfirmCloseOverlay = ({ open, onConfirm, onCancel, message, keepGoingLabel }) => {
  if (!open) return null;

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Close chant confirmation"
      onClick={onCancel}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        bgcolor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box
        onClick={(event) => event.stopPropagation()}
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: themeColors.bgCard,
          borderRadius: '20px',
          p: { xs: 2.5, sm: 3 },
          textAlign: 'center',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '2rem' },
            color: themeColors.primary,
            mb: 2,
          }}
        >
          Close chant?
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1.1rem', sm: '1.35rem' },
            color: themeColors.text,
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          {message}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'center',
          }}
        >
          <Button
            onClick={onCancel}
            variant="outlined"
            fullWidth
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.2rem' },
              textTransform: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              color: themeColors.orange,
              maxWidth: { sm: 220 },
            }}
          >
            {keepGoingLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            fullWidth
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.2rem' },
              textTransform: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: themeColors.secondary,
              color: themeColors.textInverse,
              maxWidth: { sm: 220 },
              '&:hover': { backgroundColor: themeColors.primary },
            }}
          >
            Yes, Close
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const ChantReferenceAudio = ({ url, label, audioOnly = false }) => {
  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  if (audioOnly) {
    return (
      <Box
        sx={{
          backgroundColor: themeColors.textInverse,
          borderRadius: '18px',
          padding: { xs: 2.5, sm: 3 },
          boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          width: '100%',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: themeColors.bgSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MusicNoteIcon sx={{ fontSize: 36, color: themeColors.secondary }} aria-hidden />
        </Box>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 800,
            color: themeColors.text,
            fontSize: { xs: '1.05rem', sm: '1.15rem' },
            textAlign: 'center',
          }}
        >
          Chant audio
        </Typography>
        <Box
          component="audio"
          src={url}
          controls
          preload="metadata"
          aria-label={label}
          sx={{
            width: '100%',
            display: 'block',
            borderRadius: '10px',
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: themeColors.textInverse,
        borderRadius: '14px',
        padding: { xs: 1.5, sm: 2 },
        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 800,
          color: themeColors.text,
          marginBottom: 1,
          fontSize: { xs: '0.95rem', sm: '1rem' },
        }}
      >
        Chant audio
      </Typography>
      <Box
        component="audio"
        ref={audioRef}
        src={url}
        preload="metadata"
        onEnded={() => setIsPlaying(false)}
        sx={{ display: 'none' }}
      />
      <Button
        onClick={handleToggle}
        variant="outlined"
        size="large"
        startIcon={isPlaying ? <PauseIcon sx={{ fontSize: 28 }} /> : <PlayArrowIcon sx={{ fontSize: 28 }} />}
        aria-label={label}
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: { xs: '1rem', sm: '1.05rem' },
          textTransform: 'none',
          borderRadius: '12px',
          borderWidth: '2px',
          width: '100%',
          py: { xs: 1.25, sm: 1.5 },
        }}
      >
        {isPlaying ? 'Pause chant audio' : 'Play chant audio'}
      </Button>
    </Box>
  );
};

/**
 * Chant Watch Modal (Child-facing)
 *
 * Listen to chant audio (and optional video), then tap the completion button.
 * Matches app chant-modal — no recording required.
 */
const ChantRecordingModal = ({ open, onClose, chant, childId, courseId, onAfterComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();
  const chantId = chant?._id || chant?._contentId || chant?.contentId || chant?.id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const instructionVideoMedia = useMemo(() => {
    return progress?.chant?.instructionVideo || chant?.instructionVideo || null;
  }, [progress?.chant?.instructionVideo, chant?.instructionVideo]);

  const coverImage = useMemo(() => {
    return progress?.chant?.coverImage || chant?.coverImage || null;
  }, [progress?.chant?.coverImage, chant?.coverImage]);

  const referenceAudioUrl = useMemo(() => {
    const media = progress?.chant?.audio || chant?.audio;
    const url = typeof media === 'string' ? media : media?.url;
    return buildPublicUrl(url);
  }, [progress?.chant?.audio, chant?.audio]);

  const hasInstructionVideo = useMemo(() => {
    const playback = resolveInstructionVideoPlayback(instructionVideoMedia, buildPublicUrl);
    return Boolean(playback?.url);
  }, [instructionVideoMedia]);

  const hasCoverImage = useMemo(() => {
    const raw = coverImage;
    if (!raw) return false;
    const path = typeof raw === 'string' ? raw : raw?.url || raw?.cloudUrl || null;
    return Boolean(getCoverImageUrl(path));
  }, [coverImage]);

  const isAudioOnlyChant = Boolean(referenceAudioUrl) && !hasInstructionVideo && !hasCoverImage;
  const isAudioOnlyPhoneMode = isAudioOnlyChant && isMobile;
  const hasCoverOnly = !hasInstructionVideo && hasCoverImage;

  const completionLabels = useMemo(
    () => getChantCompletionLabels({
      hasInstructionVideo,
      hasReferenceAudio: Boolean(referenceAudioUrl),
    }),
    [hasInstructionVideo, referenceAudioUrl]
  );

  const fetchProgress = async () => {
    if (!chantId || !childId) return;
    const res = await chantProgressService.getProgress(chantId, childId);
    setProgress(res?.data || null);
  };

  useEffect(() => {
    if (!open) return;
    if (!chantId || !childId) return;

    setError(null);
    setLoading(true);

    Promise.resolve()
      .then(() => chantProgressService.start(chantId, childId))
      .then(() => fetchProgress())
      .catch((e) => {
        setError(typeof e === 'string' ? e : e?.message || 'Failed to load chant');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chantId, childId]);

  useEffect(() => {
    if (!open) {
      setProgress(null);
      setError(null);
      setShowConfirmClose(false);
    }
  }, [open]);

  const status = progress?.status || 'not_started';
  const isCompleted = status === 'completed';

  const handleCloseAttempt = () => {
    if (!isCompleted && !submitting) {
      setShowConfirmClose(true);
      return;
    }
    onClose();
  };

  const handleConfirmedClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  const updateChildStars = (starsEarned) => {
    if (!starsEarned) return;

    try {
      const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
      const selectedChild = JSON.parse(sessionStorage.getItem('selectedChild') || '{}');
      const currentTotalStars = (selectedChild.stats?.totalStars || 0) + starsEarned;

      dispatch(updateChildStats({
        childId,
        stats: { totalStars: currentTotalStars },
      }));

      sessionStorage.setItem('selectedChild', JSON.stringify({
        ...selectedChild,
        stats: { ...selectedChild.stats, totalStars: currentTotalStars },
      }));

      sessionStorage.setItem('childProfiles', JSON.stringify(
        childProfiles.map((c) =>
          c._id === childId
            ? { ...c, stats: { ...c.stats, totalStars: currentTotalStars } }
            : c
        )
      ));
      window.dispatchEvent(new Event('childStatsUpdated'));
    } catch {
      // non-blocking
    }
  };

  const handleFinishedWatching = async () => {
    if (!chantId || !childId || isCompleted || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const completeResult = await chantProgressService.completeWatch(chantId, childId, {
        timeSpent: 0,
        metadata: { completionType: 'watch' },
      });

      if (!completeResult?.success) {
        throw new Error(completeResult?.message || 'Failed to complete chant');
      }

      // Optimistically mark completed so the finish button disappears immediately
      setProgress((prev) => ({
        ...(prev || {}),
        ...(completeResult.data || {}),
        status: 'completed',
      }));

      await fetchProgress();

      if (courseId) {
        // Non-blocking: chant is already saved even if course progress sync fails
        void courseProgressService.updateContentProgress(courseId, childId, chantId, 'chant');
      }

      const starsEarned = completeResult?.data?.starsEarned ?? 0;
      updateChildStars(starsEarned);

      if (onAfterComplete) onAfterComplete();
      onClose();
    } catch (e) {
      setError(typeof e === 'string' ? e : e?.message || 'Failed to complete chant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (reason === 'backdropClick') {
            handleCloseAttempt();
            return;
          }
          handleCloseAttempt();
        }}
        disableEscapeKeyDown
        fullWidth
        maxWidth={hasInstructionVideo ? 'md' : 'sm'}
        fullScreen={isAudioOnlyPhoneMode}
        PaperProps={{
          sx: {
            position: 'relative',
            borderRadius: isAudioOnlyPhoneMode ? 0 : { xs: '16px', sm: '18px' },
            overflow: 'hidden',
            backgroundColor: themeColors.bgCard,
            width: '100%',
            maxWidth: isAudioOnlyPhoneMode
              ? '100%'
              : hasInstructionVideo
                ? { xs: 'calc(100% - 24px)', sm: 900 }
                : { xs: 'calc(100% - 24px)', sm: 480 },
            maxHeight: isAudioOnlyPhoneMode ? '100dvh' : { xs: '92dvh', sm: '88vh' },
            minHeight: hasInstructionVideo ? { xs: 'auto', sm: 520 } : 'auto',
            display: 'flex',
            flexDirection: 'column',
            mx: isAudioOnlyPhoneMode ? 0 : { xs: 1.5, sm: 2 },
            my: isAudioOnlyPhoneMode ? 0 : { xs: 1.5, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: { xs: 2, sm: 2.5 },
            backgroundColor: themeColors.bgCard,
            borderBottom: `3px solid ${themeColors.secondary}`,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.2rem', sm: '1.5rem' },
              color: themeColors.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
              pr: 1,
            }}
          >
            {chant?.title || 'Chant'}
          </Typography>
          <IconButton aria-label="Close chant modal" onClick={handleCloseAttempt} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            padding: 0,
            backgroundColor: themeColors.bgSecondary,
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <Box sx={{ padding: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                padding: isAudioOnlyPhoneMode ? { xs: 2.5, sm: 3 } : { xs: 1.75, sm: 2 },
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 1.5, sm: 2 },
                alignItems: isAudioOnlyPhoneMode ? 'center' : 'stretch',
              }}
            >
              {error && (
                <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  {error}
                </Alert>
              )}

              {!isAudioOnlyChant && (
                <Box sx={{ width: '100%' }}>
                  <InstructionVideoPlayer
                    media={instructionVideoMedia}
                    coverImage={coverImage}
                    title={chant?.title || 'Chant video'}
                    autoPlayMutedLoop={false}
                    compactCover={hasCoverOnly}
                  />
                </Box>
              )}

              {referenceAudioUrl && (
                <ChantReferenceAudio
                  url={referenceAudioUrl}
                  label="Tap to play chant audio"
                  audioOnly={isAudioOnlyPhoneMode}
                />
              )}

              {(chant?.instructions || '').trim() && (
                <Box
                  sx={{
                    backgroundColor: themeColors.textInverse,
                    borderRadius: '14px',
                    padding: { xs: 1.5, sm: 2 },
                    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                    width: '100%',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: themeColors.textSecondary,
                      lineHeight: 1.6,
                      fontSize: { xs: '0.95rem', sm: '1rem' },
                    }}
                  >
                    {chant.instructions}
                  </Typography>
                </Box>
              )}

              {isCompleted && (
                <Alert icon={<CheckIcon />} severity="success" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Completed! You earned {progress?.starsEarned || 0} stars.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        {!isCompleted && !loading && (
          <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 1, pb: 0.5, flexShrink: 0 }}>
            <Button
              onClick={handleFinishedWatching}
              variant="contained"
              disabled={submitting}
              fullWidth
              aria-label={completionLabels.finishLabel}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                textTransform: 'none',
                borderRadius: '14px',
                py: { xs: 1.5, sm: 1.75 },
                backgroundColor: themeColors.success,
                color: themeColors.textInverse,
                '&:hover': { backgroundColor: themeColors.secondary },
              }}
            >
              {submitting ? 'Saving…' : completionLabels.finishLabel}
            </Button>
          </Box>
        )}

        <DialogActions
          sx={{
            padding: { xs: 2, sm: 2.5 },
            backgroundColor: themeColors.bgCard,
            borderTop: `2px solid ${themeColors.bgTertiary}`,
            flexShrink: 0,
          }}
        >
          <Button
            onClick={handleCloseAttempt}
            variant="outlined"
            fullWidth
            role="button"
            aria-label="Close"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: '14px',
              borderWidth: '2px',
              py: { xs: 1.25, sm: 1.5 },
            }}
          >
            Close
          </Button>
        </DialogActions>

        <ConfirmCloseOverlay
          open={showConfirmClose}
          onConfirm={handleConfirmedClose}
          onCancel={() => setShowConfirmClose(false)}
          message={completionLabels.closeConfirmMessage}
          keepGoingLabel={completionLabels.keepGoingLabel}
        />
      </Dialog>
    </>
  );
};

export default ChantRecordingModal;
