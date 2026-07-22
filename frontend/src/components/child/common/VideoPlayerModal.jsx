import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import ScormPlayer from './ScormPlayer';
import useCourseProgress from '../../../hooks/courseProgressHook';
import useExploreVideoWatch from '../../../hooks/exploreVideoWatchHook';
import ChildDialogBox from '../../common/ChildDialogBox';
import { useDispatch } from 'react-redux';
import { applyStarRewardFromCompletion } from '../../../utils/childStatsSync';
import courseProgressService from '../../../services/courseProgressService';
import { BACKEND_BASE_URL } from '../../../config/constants';
import html5Service from '../../../services/html5Service';
import CmsBooksModalPlayer from './cms/CmsBooksModalPlayer';
import BunnyEmbedIframe from './BunnyEmbedIframe';
import { resolveChildVideoPlayback } from '../../../utils/childVideoPlayback';

const buildMediaUrl = (path) => {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BACKEND_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

// Confirmation Dialog Component
const ConfirmCloseDialog = ({ open, onConfirm, onCancel, title, message }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    maxWidth="sm"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: '20px',
        fontFamily: 'Quicksand, sans-serif',
        backgroundColor: themeColors.bgCard,
        padding: '8px',
      },
    }}
  >
    <DialogTitle
      sx={{
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 700,
        fontSize: '2rem',
        color: themeColors.primary,
        textAlign: 'center',
        padding: '24px',
      }}
    >
      {title || 'Are you sure?'}
    </DialogTitle>
    <DialogContent
      sx={{
        padding: '0 24px',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '1.5rem',
          color: themeColors.text,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        {message || 'Do you want to close this video? Your progress will be saved!'}
      </Typography>
    </DialogContent>
    <DialogActions
      sx={{
        padding: '24px',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Button
        onClick={onCancel}
        variant="outlined"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: '1.3rem',
          textTransform: 'none',
          padding: '12px 32px',
          borderRadius: '12px',
          color: themeColors.orange,
          '&:hover': {
            backgroundColor: themeColors.bgTertiary,
          },
        }}
      >
        Keep Watching
      </Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: '1.3rem',
          textTransform: 'none',
          padding: '12px 32px',
          borderRadius: '12px',
          backgroundColor: themeColors.secondary,
          color: themeColors.textInverse,
          '&:hover': {
            backgroundColor: themeColors.primary,
          },
        }}
      >
        Yes, Close
      </Button>
    </DialogActions>
  </Dialog>
);

/**
 * VideoPlayerModal Component
 * 
 * Modal for playing videos with optional SCORM integration.
 * Plays video first, then shows "Start" button if SCORM file exists.
 * 
 * Features:
 * - Auto-plays video after loading
 * - Disables all video controls (no pause/play/seek)
 * - Tracks video watch count when video finishes
 * - Shows congratulatory dialog when video completes
 * 
 * @param {Boolean} open - Modal open state
 * @param {Function} onClose - Close handler
 * @param {Object} video - Video object with url, title, and optional scormFile
 * @param {Function} onVideoComplete - Callback when video finishes
 * @param {String} childId - Child's ID (required for watch tracking)
 * @param {String} courseId - Course's ID (optional, for course progress)
 * @param {Boolean} isExploreVideo - Whether this is an explore video (default: false)
 * @param {String} exploreContentId - ExploreContent ID (required if isExploreVideo is true)
 * @param {Object} exploreContent - Full explore content row (preferred for upload vs Bunny resolution)
 * @param {String} videoType - Video type for explore videos (e.g., 'replay', 'cooking', etc.)
 */
const VideoPlayerModal = ({
  open,
  onClose,
  video,
  onVideoComplete,
  childId,
  courseId,
  isExploreVideo = false,
  exploreContentId = null,
  exploreContent = null,
  videoType = null,
}) => {
  const theme = useTheme();
  const isMobileLayout = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const autoCloseTimerRef = useRef(null); // Ref to track auto-close timer
  const completionDialogShownRef = useRef(false); // Track if completion dialog has been shown for this video
  const [videoEnded, setVideoEnded] = useState(false);
  const [scormOpen, setScormOpen] = useState(false);
  const [html5Open, setHtml5Open] = useState(false);
  const [cmsBookOpen, setCmsBookOpen] = useState(false);
  const [html5LaunchUrl, setHtml5LaunchUrl] = useState(null);
  const [html5Error, setHtml5Error] = useState(null);
  const [html5Loading, setHtml5Loading] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [watchResult, setWatchResult] = useState(null);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  const [hasRecordedWatch, setHasRecordedWatch] = useState(false); // Prevent duplicate watch recording
  const [isClosingModal, setIsClosingModal] = useState(false); // Track if we're closing the modal
  const [embedIframeLoaded, setEmbedIframeLoaded] = useState(false);

  const playback = useMemo(
    () =>
      resolveChildVideoPlayback(video, {
        isExploreVideo,
        exploreContent,
        buildMediaUrl,
      }),
    [video, isExploreVideo, exploreContent]
  );

  const isBunnyEmbed = playback.mode === 'embed';
  const embedUrl = isBunnyEmbed ? playback.url : null;
  const fileVideoUrl = !isBunnyEmbed ? playback.url : null;
  const hasPlayableSource = Boolean(isBunnyEmbed ? embedUrl : fileVideoUrl);

  // Get video watch methods from hooks
  // Note: Using markVideoWatched and getVideoWatchStatus from hook
  // But using courseProgressService directly for updateProgress to avoid unnecessary refreshes
  const { markVideoWatched, getVideoWatchStatus } = useCourseProgress(childId);
  const { markExploreVideoWatched, getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  // State to track if stars were already awarded before this watch
  const [starsAlreadyAwarded, setStarsAlreadyAwarded] = useState(false);
  // State to track watch status before this watch (to compare after)
  const [watchStatusBefore, setWatchStatusBefore] = useState(null);

  // Check if video has SCORM file
  const hasScorm = !!(video?.scormFile || video?.scormFileUrl || video?.scormFilePath);
  const hasHtml5FollowUp = !!(video?.html5PackageId && (video?.completionContentType === 'html5' || !video?.completionContentType));
  const linkedCmsBook = video?.cmsBookId && typeof video.cmsBookId === 'object' ? video.cmsBookId : null;
  const hasCmsBookFollowUp = !!(
    linkedCmsBook &&
    video?.completionContentType === 'builtin' &&
    Array.isArray(linkedCmsBook.pages) &&
    linkedCmsBook.pages.length > 0
  );
  const hasFollowUpContent = hasScorm || hasHtml5FollowUp || hasCmsBookFollowUp;

  // Check video watch status when video opens
  // Use checkbox logic: if watch count >= required count, stars were already awarded
  // Store the status to compare after watching
  useEffect(() => {
    const checkVideoStatus = async () => {
      if (open && childId) {
        try {
          let status;

          if (isExploreVideo && exploreContentId) {
            // Use explore video watch status
            status = await getExploreVideoWatchStatus(exploreContentId);
            const currentWatchCount = status?.currentWatchCount || 0;
            const requiredWatchCount = status?.requiredWatchCount || 1; // Explore videos: 1 watch

            // Store status before watching for comparison
            setWatchStatusBefore({
              currentWatchCount,
              requiredWatchCount,
              starsAwarded: status?.starsAwarded || false,
            });

            // For explore videos, stars are awarded on first watch
            // If starsAwarded is true, stars were already earned
            setStarsAlreadyAwarded(status?.starsAwarded || false);
          } else if (video) {
            // Use regular video watch status
            const videoId = video?._id || video?._contentId || video?.contentId || video?.id;
            if (videoId) {
              status = await getVideoWatchStatus(videoId);
              const currentWatchCount = status?.currentWatchCount || 0;
              const requiredWatchCount = status?.requiredWatchCount || 5;

              // Store status before watching for comparison
              setWatchStatusBefore({
                currentWatchCount,
                requiredWatchCount,
                starsAwarded: status?.starsAwarded || false,
              });

              // Use checkbox logic: if all checkboxes are filled, stars were already awarded
              const allCheckboxesFilled = currentWatchCount >= requiredWatchCount;

              // Also check the starsAwarded flag as fallback
              const starsAwardedFlag = status?.starsAwarded || false;

              setStarsAlreadyAwarded(allCheckboxesFilled || starsAwardedFlag);
            }
          }
        } catch (error) {
          console.error('Error checking video status:', error);
          setStarsAlreadyAwarded(false);
          setWatchStatusBefore(null);
        }
      } else {
        setStarsAlreadyAwarded(false);
        setWatchStatusBefore(null);
      }
    };

    checkVideoStatus();
  }, [open, childId, video, isExploreVideo, exploreContentId, getVideoWatchStatus, getExploreVideoWatchStatus]);

  // Reset session state when a new video opens
  useEffect(() => {
    if (!video || !open || completionDialogShownRef.current) return;

    setEmbedIframeLoaded(false);
    setVideoEnded(false);
    setScormOpen(false);
    setHtml5Open(false);
    setCmsBookOpen(false);
    setHtml5LaunchUrl(null);
    setHtml5Error(null);
    setHtml5Loading(false);
    setShowConfirmClose(false);
    setVideoLoaded(false);
    setVideoPlaying(false);
    setShowCompletionDialog(false);
    setWatchResult(null);
    setIsRecordingWatch(false);
    setHasRecordedWatch(false);
    setStarsAlreadyAwarded(false);
    setWatchStatusBefore(null);
    setIsClosingModal(false);
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    completionDialogShownRef.current = false;
  }, [
    video?._id,
    video?.url,
    video?.embedUrl,
    video?.videoSource,
    video?.filePath,
    exploreContent?._id,
    open,
    playback.mode,
    playback.url,
  ]);

  // Auto-play uploaded (non-Bunny) videos when loaded
  useEffect(() => {
    if (isBunnyEmbed || !open || !fileVideoUrl || videoLoaded) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const tryPlay = () => {
      setVideoLoaded(true);
      videoElement
        .play()
        .then(() => setVideoPlaying(true))
        .catch((error) => {
          console.error('Error auto-playing video:', error);
        });
    };

    const handlePlay = () => setVideoPlaying(true);

    const handlePause = () => {
      if (videoElement.paused && !videoEnded) {
        videoElement.play().catch(console.error);
      }
    };

    const handleSeeking = () => {
      if (!videoEnded) {
        const currentTime = videoElement.currentTime;
        videoElement.currentTime = currentTime;
      }
    };

    if (videoElement.readyState >= 3) {
      tryPlay();
    }

    videoElement.addEventListener('canplay', tryPlay);
    videoElement.addEventListener('loadeddata', tryPlay);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('seeking', handleSeeking);
    videoElement.addEventListener('seeked', handleSeeking);

    return () => {
      videoElement.removeEventListener('canplay', tryPlay);
      videoElement.removeEventListener('loadeddata', tryPlay);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('seeking', handleSeeking);
      videoElement.removeEventListener('seeked', handleSeeking);
    };
  }, [isBunnyEmbed, open, fileVideoUrl, videoLoaded, videoEnded]);

  // Add beforeunload warning when modal is open
  useEffect(() => {
    if (open) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your video progress may be lost.';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [open]);

  // Handle video end
  const handleVideoEnd = async () => {
    // Prevent duplicate watch recording - if we've already recorded this watch, don't record again
    if (hasRecordedWatch) {
      console.log('[VideoPlayer] Watch already recorded for this video session, skipping duplicate recording');
      return;
    }

    setVideoEnded(true);
    setVideoPlaying(false);

    // Record video watch if childId is provided
    if (childId) {
      setIsRecordingWatch(true);
      setHasRecordedWatch(true); // Mark that we're recording this watch
      try {
        let result;

        if (isExploreVideo && exploreContentId) {
          // Use explore video watch service
          // Check if stars were already awarded BEFORE this watch
          const starsWereAlreadyAwarded = watchStatusBefore?.starsAwarded || false;

          // Mark explore video as watched (100% completion)
          result = await markExploreVideoWatched(exploreContentId, 100);

          // The result already includes starsJustAwarded and starsWereAlreadyAwarded flags
          // For explore videos, stars are awarded on first watch (requiredWatchCount = 1)
          setWatchResult(result);

          // Update child stats is handled in the hook
          // No course progress update for explore videos
        } else {
          // Use regular video watch service (for journey/course videos)
          const videoId = video?._id || video?._contentId || video?.contentId || video?.id;

          if (!videoId) {
            throw new Error('Video ID not found');
          }

          // Mark video as watched (100% completion)
          result = await markVideoWatched(videoId, 100);

          const wasFullyCompleteBefore = watchStatusBefore?.starsAwarded || false;
          const isFullyCompleteNow = result?.videoWatch?.starsAwarded || result?.allStarsAwarded || false;
          const starsJustAwarded = (result?.starsToAward ?? result?.starsEarnedThisSession ?? 0) > 0;

          applyStarRewardFromCompletion({
            childId,
            starsToAward: result?.starsToAward ?? result?.starsEarnedThisSession ?? 0,
            dispatch,
          });

          const updatedResult = {
            ...result,
            starsJustAwarded,
            starsWereAlreadyAwarded: wasFullyCompleteBefore && !starsJustAwarded,
            allStarsAwarded: isFullyCompleteNow,
          };

          setWatchResult(updatedResult);

          if (courseId && isFullyCompleteNow && !wasFullyCompleteBefore) {
            try {
              await courseProgressService.updateContentProgress(courseId, childId, videoId, 'video');
              console.log('[VideoPlayer] Course progress updated silently after video completion (stars awarded)');
            } catch (progressError) {
              console.error('[VideoPlayer] Error updating course progress:', progressError);
              // Don't fail the whole flow if course progress update fails
            }
          }
        }

        // Show completion dialog - DON'T call onVideoComplete yet, wait for user to close dialog
        console.log('[VideoPlayer] Showing completion dialog, watchResult:', result);
        completionDialogShownRef.current = true; // Mark that completion dialog has been shown
        setShowCompletionDialog(true);
      } catch (error) {
        console.error('Error recording video watch:', error);
        // Still show completion dialog even if watch recording fails
        completionDialogShownRef.current = true; // Mark that completion dialog has been shown
        setShowCompletionDialog(true);
      } finally {
        setIsRecordingWatch(false);
      }
    } else {
      // No childId - just show completion dialog
      completionDialogShownRef.current = true; // Mark that completion dialog has been shown
      setShowCompletionDialog(true);
    }

    // DON'T call onVideoComplete here - wait until user closes the completion dialog
    // This prevents the modal from closing/reloading before user sees the message
  };

  useEffect(() => {
    if (!html5Open || !hasHtml5FollowUp) return undefined;

    let cancelled = false;
    const loadHtml5FollowUp = async () => {
      try {
        setHtml5Loading(true);
        setHtml5Error(null);
        const { launchUrl } = await html5Service.getLaunchUrl(
          video.html5PackageId,
          video.html5EntryPoint || 'index.html'
        );
        if (!cancelled) {
          setHtml5LaunchUrl(launchUrl || null);
          if (!launchUrl) setHtml5Error('Failed to get HTML5 launch URL.');
        }
      } catch (error) {
        if (!cancelled) {
          setHtml5Error(error?.message || 'Failed to load HTML5 follow-up.');
          setHtml5LaunchUrl(null);
        }
      } finally {
        if (!cancelled) setHtml5Loading(false);
      }
    };

    loadHtml5FollowUp();

    return () => {
      cancelled = true;
    };
  }, [html5Open, hasHtml5FollowUp, video?.html5PackageId, video?.html5EntryPoint]);

  // Handle interactive follow-up start
  const handleStartFollowUp = () => {
    if (hasHtml5FollowUp) {
      setHtml5Open(true);
      return;
    }
    if (hasCmsBookFollowUp) {
      setCmsBookOpen(true);
      return;
    }
    if (hasScorm) {
      setScormOpen(true);
    }
  };

  // Handle close attempt - show confirmation
  const handleCloseAttempt = () => {
    const skipCloseConfirm =
      (isBunnyEmbed && hasRecordedWatch) ||
      (isExploreVideo && starsAlreadyAwarded && isBunnyEmbed);

    if (skipCloseConfirm) {
      handleConfirmedClose();
      return;
    }
    setShowConfirmClose(true);
  };

  // Handle confirmed close
  const handleConfirmedClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setVideoEnded(false);
    setScormOpen(false);
    setHtml5Open(false);
    setCmsBookOpen(false);
    setHtml5LaunchUrl(null);
    setHtml5Error(null);
    setHtml5Loading(false);
    setShowConfirmClose(false);
    setShowCompletionDialog(false);
    setWatchResult(null);

    // Call onVideoComplete when modal is actually closed
    // This ensures refreshes happen when modal closes, not when completion dialog closes
    // onVideoComplete will trigger component refreshes (header, video cards, progress)
    if (onVideoComplete) {
      // Small delay to ensure modal is fully closed before triggering refreshes
      setTimeout(() => {
        onVideoComplete(video);
      }, 100);
    }

    onClose();
  };

  // Auto-close completion dialog and modal after delay (for explore videos without SCORM)
  useEffect(() => {
    // Only set up auto-close for explore videos without interactive follow-up
    // Replay videos also get auto-close (they're explore videos too)
    if (showCompletionDialog && !hasFollowUpContent && isExploreVideo) {
      // Clear any existing timer first
      if (autoCloseTimerRef.current) {
        console.log('[VideoPlayer] Clearing existing auto-close timer');
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      console.log('[VideoPlayer] Auto-close timer started for explore video completion dialog');
      // Auto-close completion dialog after 3 seconds for explore videos
      autoCloseTimerRef.current = setTimeout(() => {
        console.log('[VideoPlayer] Auto-closing completion dialog and modal after 3 seconds');
        // Clear the ref
        autoCloseTimerRef.current = null;

        // Set closing state to prevent main modal from reappearing
        setIsClosingModal(true);
        // Close completion dialog
        setShowCompletionDialog(false);

        // Then close the main modal and trigger callbacks after a short delay
        setTimeout(() => {
          // Call onVideoComplete callback
          if (onVideoComplete) {
            console.log('[VideoPlayer] Calling onVideoComplete callback');
            onVideoComplete(video);
          }

          // Close the main modal completely
          console.log('[VideoPlayer] Closing main video modal');
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          setVideoEnded(false);
          setScormOpen(false);
          setHtml5Open(false);
          setCmsBookOpen(false);
          setHtml5LaunchUrl(null);
          setHtml5Error(null);
          setHtml5Loading(false);
          setShowConfirmClose(false);
          setWatchResult(null);
          setHasRecordedWatch(false);
          setStarsAlreadyAwarded(false);
          setWatchStatusBefore(null);
          setIsClosingModal(false);
          completionDialogShownRef.current = false; // Reset for next video

          // Close the modal
          onClose();
        }, 200);
      }, 3000);

      return () => {
        // Cleanup: clear timer if component unmounts or effect re-runs
        if (autoCloseTimerRef.current) {
          console.log('[VideoPlayer] Cleaning up auto-close timer');
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = null;
        }
      };
    } else {
      // If conditions aren't met, clear any existing timer
      if (autoCloseTimerRef.current) {
        console.log('[VideoPlayer] Clearing auto-close timer (conditions not met)');
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCompletionDialog, hasFollowUpContent, isExploreVideo]);

  // Handle completion dialog close (manual close via button or auto-close)
  const handleCompletionDialogClose = () => {
    console.log('[VideoPlayer] handleCompletionDialogClose called');

    // Clear auto-close timer if it exists (user clicked close button)
    if (autoCloseTimerRef.current) {
      console.log('[VideoPlayer] Clearing auto-close timer (manual close)');
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    // If video has follow-up content, open it after the completion dialog.
    // Don't call onVideoComplete or close modal yet
    if (hasFollowUpContent) {
      setShowCompletionDialog(false);
      handleStartFollowUp();
      // onVideoComplete will be called when modal is actually closed
      return;
    }

    // No SCORM - close modal after user clicks the button
    // Set closing state to prevent main modal from reappearing
    setIsClosingModal(true);
    setShowCompletionDialog(false);

    // Call onVideoComplete callback first
    if (onVideoComplete) {
      console.log('[VideoPlayer] Calling onVideoComplete callback');
      setTimeout(() => {
        onVideoComplete(video);
      }, 100);
    }

    // Close modal after a short delay to ensure dialog closes first
    setTimeout(() => {
      console.log('[VideoPlayer] Calling handleConfirmedClose to close modal');
      handleConfirmedClose();
      setIsClosingModal(false);
      completionDialogShownRef.current = false; // Reset for next video
    }, 300);
  };

  // Handle cancel close
  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  // Handle SCORM close
  const handleScormClose = () => {
    setScormOpen(false);
    // Don't close video modal, let user close it manually
  };

  const handleHtml5Close = () => {
    setHtml5Open(false);
    setHtml5LaunchUrl(null);
    setHtml5Error(null);
    setHtml5Loading(false);
  };

  const handleCmsBookClose = () => {
    setCmsBookOpen(false);
  };

  // Get video ID
  const videoId = video?._id || video?._contentId || video?.contentId || video?.id;

  const showBunnyFinishButton = isBunnyEmbed && !hasRecordedWatch && childId;

  const finishWatchingButton = (
    <Button
      variant="contained"
      onClick={handleVideoEnd}
      disabled={isRecordingWatch}
      fullWidth={isMobileLayout}
      sx={{
        backgroundColor: themeColors.accent,
        color: themeColors.textInverse,
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 700,
        textTransform: 'none',
        padding: isMobileLayout ? '12px 16px' : '12px 32px',
        fontSize: isMobileLayout ? '1rem' : '1.3rem',
        borderRadius: '12px',
        '&:hover': {
          backgroundColor: themeColors.orange,
        },
      }}
      aria-label="I finished watching"
    >
      I finished watching
    </Button>
  );

  const followUpStartButton = (
    <Button
      variant="contained"
      onClick={handleStartFollowUp}
      startIcon={<PlayArrowIcon sx={{ fontSize: isMobileLayout ? '1.25rem' : '2rem' }} />}
      sx={{
        backgroundColor: themeColors.secondary,
        color: themeColors.textInverse,
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 700,
        textTransform: 'none',
        padding: isMobileLayout ? '10px 20px' : '16px 48px',
        fontSize: isMobileLayout ? '1rem' : '1.8rem',
        borderRadius: '16px',
        boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.3)',
        '&:hover': {
          backgroundColor: themeColors.primary,
          transform: isMobileLayout ? 'none' : 'scale(1.08)',
          boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.4)',
        },
      }}
    >
      {hasHtml5FollowUp
        ? 'Start HTML5 Book'
        : hasCmsBookFollowUp
          ? 'Start Built-in Book'
          : 'Start Interactive Activity'}
    </Button>
  );

  const overlayTextSx = {
    fontFamily: 'Quicksand, sans-serif',
    color: themeColors.textInverse,
    fontSize: isMobileLayout ? '1.125rem' : '1.5rem',
    fontWeight: 600,
  };

  const videoAreaSx = {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000',
    ...(isMobileLayout
      ? { aspectRatio: '16 / 9', flexShrink: 0 }
      : { flex: 1, minHeight: 0 }),
  };

  return (
    <>
      <Dialog
        open={open && !scormOpen && !html5Open && !cmsBookOpen && !showCompletionDialog && !isClosingModal}
        onClose={handleCloseAttempt}
        maxWidth={isMobileLayout ? 'xs' : 'lg'}
        fullWidth
        disableEscapeKeyDown={true}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'center',
            padding: isMobileLayout ? 2 : 0,
          },
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: isMobileLayout ? '16px' : '20px',
            fontFamily: 'Quicksand, sans-serif',
            width: '100%',
            maxWidth: isMobileLayout ? 480 : undefined,
            height: isMobileLayout ? 'auto' : '90vh',
            maxHeight: isMobileLayout ? 'calc(100vh - 32px)' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: themeColors.bgCard,
            borderBottom: isMobileLayout ? `3px solid ${themeColors.secondary}` : undefined,
            m: 0,
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: isMobileLayout ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)',
          },
          onClick: (e) => {
            // Prevent closing on backdrop click
            e.stopPropagation();
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobileLayout ? 2 : 4,
            flexShrink: 0,
            backgroundColor: themeColors.bgCard,
            borderBottom: isMobileLayout ? `2px solid ${themeColors.bgTertiary}` : undefined,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: isMobileLayout ? '1.25rem' : '2rem',
              color: themeColors.primary,
              flex: 1,
              mr: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {video?.title || 'Video'}
          </Typography>
          <IconButton
            onClick={handleCloseAttempt}
            size={isMobileLayout ? 'medium' : 'large'}
            sx={{
              color: themeColors.textSecondary,
              flexShrink: 0,
              minWidth: 44,
              minHeight: 44,
              ...(isMobileLayout
                ? {}
                : {
                    color: themeColors.orange,
                    backgroundColor: themeColors.bgTertiary,
                    borderRadius: '50%',
                    padding: '12px',
                    '&:hover': {
                      backgroundColor: themeColors.orange,
                      color: themeColors.textInverse,
                      transform: 'scale(1.1)',
                    },
                  }),
            }}
            aria-label="Close video"
          >
            <CloseIcon sx={{ fontSize: isMobileLayout ? '1.625rem' : '2rem' }} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            padding: 0,
            flex: isMobileLayout ? '0 1 auto' : 1,
            minHeight: 0,
            overflow: 'hidden',
            backgroundColor: '#000',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isMobileLayout ? 'flex-start' : isBunnyEmbed ? 'stretch' : 'center',
            ...(isMobileLayout || isBunnyEmbed ? {} : { minHeight: '400px' }),
          }}
        >
          {isBunnyEmbed && embedUrl ? (
            <>
              <Box sx={videoAreaSx}>
                <BunnyEmbedIframe
                  embedUrl={embedUrl}
                  title={video?.title || 'Video'}
                  onLoad={() => {
                    setEmbedIframeLoaded(true);
                    setVideoLoaded(true);
                  }}
                />
                {(!embedIframeLoaded || isRecordingWatch) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 20,
                    }}
                  >
                    <CircularProgress
                      sx={{
                        color: themeColors.secondary,
                        marginBottom: 2,
                        width: '60px !important',
                        height: '60px !important',
                      }}
                    />
                    <Typography sx={overlayTextSx}>
                      {isRecordingWatch ? 'Recording your progress...' : 'Loading video...'}
                    </Typography>
                  </Box>
                )}
              </Box>

              {isMobileLayout && showBunnyFinishButton && (
                <Box
                  sx={{
                    width: '100%',
                    px: 2,
                    pt: 1.5,
                    backgroundColor: themeColors.bgCard,
                  }}
                >
                  {finishWatchingButton}
                </Box>
              )}

              {videoEnded && hasFollowUpContent && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                  }}
                >
                  {followUpStartButton}
                </Box>
              )}
            </>
          ) : fileVideoUrl ? (
            <Box
              sx={{
                ...videoAreaSx,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                key={fileVideoUrl}
                ref={videoRef}
                src={fileVideoUrl}
                controls={false}
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                onEnded={(e) => {
                  // Prevent multiple calls
                  if (!hasRecordedWatch) {
                    handleVideoEnd();
                  }
                }}
                onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
                onDragStart={(e) => e.preventDefault()} // Disable drag
              />

              {!videoLoaded && !isRecordingWatch && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                  }}
                >
                  <CircularProgress
                    sx={{
                      color: themeColors.secondary,
                      marginBottom: 2,
                      width: '60px !important',
                      height: '60px !important',
                    }}
                  />
                  <Typography sx={overlayTextSx}>
                    Loading video...
                  </Typography>
                </Box>
              )}

              {/* Loading overlay while recording watch */}
              {isRecordingWatch && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                  }}
                >
                  <CircularProgress
                    sx={{
                      color: themeColors.secondary,
                      marginBottom: 2,
                      width: '60px !important',
                      height: '60px !important',
                    }}
                  />
                  <Typography sx={overlayTextSx}>
                    Recording your progress...
                  </Typography>
                </Box>
              )}

              {/* Interactive follow-up button - Shows after video ends */}
              {videoEnded && hasFollowUpContent && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                  }}
                >
                  {followUpStartButton}
                </Box>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                color: themeColors.textInverse,
              }}
            >
              {video && open && !hasPlayableSource ? (
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: themeColors.textInverse,
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  This video is not available right now. Please try again later.
                </Typography>
              ) : (
                <>
                  <CircularProgress
                    sx={{
                      color: themeColors.secondary,
                      marginBottom: 3,
                      width: '60px !important',
                      height: '60px !important',
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: themeColors.textInverse,
                      fontSize: '1.8rem',
                      fontWeight: 600,
                    }}
                  >
                    Loading video...
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            padding: isMobileLayout ? 2 : 2,
            flexShrink: 0,
            backgroundColor: themeColors.bgCard,
            justifyContent: isMobileLayout ? 'flex-end' : 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            borderTop: isMobileLayout ? `2px solid ${themeColors.bgTertiary}` : undefined,
          }}
        >
          {!isMobileLayout && showBunnyFinishButton ? (
            finishWatchingButton
          ) : (
            !isMobileLayout && <Box sx={{ flex: 1 }} />
          )}
          <Button
            onClick={handleCloseAttempt}
            variant={isMobileLayout ? 'text' : 'contained'}
            sx={
              isMobileLayout
                ? {
                    color: themeColors.secondary,
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    minHeight: 44,
                    px: 2,
                  }
                : {
                    backgroundColor: themeColors.secondary,
                    color: themeColors.textInverse,
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    textTransform: 'none',
                    padding: '12px 32px',
                    fontSize: '1.3rem',
                    borderRadius: '12px',
                    border: `3px solid ${themeColors.primary}`,
                    '&:hover': {
                      backgroundColor: themeColors.primary,
                      transform: 'scale(1.05)',
                    },
                  }
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* SCORM Player Modal */}
      {hasScorm && videoId && (
        <ScormPlayer
          open={scormOpen}
          onClose={handleScormClose}
          contentId={videoId}
          contentType="video"
          contentTitle={video?.title || 'Interactive Activity'}
          onComplete={(data) => {
            console.log('SCORM completed:', data);
            // SCORM completion is handled in ScormPlayer component
          }}
        />
      )}

      {/* HTML5 follow-up player */}
      {hasHtml5FollowUp && (
        <Dialog
          open={html5Open}
          onClose={handleHtml5Close}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              fontFamily: 'Quicksand, sans-serif',
              height: '90vh',
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
            }}
          >
            {video?.title || 'HTML5 Book'}
            <IconButton onClick={handleHtml5Close} aria-label="Close HTML5 follow-up">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: '100%', position: 'relative' }}>
            {html5Loading ? (
              <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                <CircularProgress sx={{ color: themeColors.secondary }} />
              </Box>
            ) : html5Error ? (
              <Box sx={{ p: 3 }}>
                <Alert severity="error">{html5Error}</Alert>
              </Box>
            ) : html5LaunchUrl ? (
              <Box
                component="iframe"
                title={`${video?.title || 'Video'} HTML5 follow-up`}
                src={html5LaunchUrl}
                sx={{ width: '100%', height: '100%', border: 0 }}
                allow="fullscreen; autoplay"
              />
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      {/* Built-in CMS book follow-up player */}
      {hasCmsBookFollowUp && (
        <CmsBooksModalPlayer
          open={cmsBookOpen}
          onClose={handleCmsBookClose}
          pages={linkedCmsBook.pages}
          onSessionComplete={() => {}}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmCloseDialog
        open={showConfirmClose}
        onConfirm={handleConfirmedClose}
        onCancel={handleCancelClose}
        title="Close Video?"
        message={
          isBunnyEmbed
            ? 'Do you want to close this video? Tap I finished watching when you are done to save your progress.'
            : undefined
        }
      />

      {/* Video Completion Dialog */}
      <Dialog
        open={showCompletionDialog}
        onClose={handleCompletionDialogClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={true}
        PaperProps={{
          elevation: 24,
          sx: {
            borderRadius: '20px',
            fontFamily: 'Quicksand, sans-serif',
            backgroundColor: themeColors.bgCard,
            padding: '8px',
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          },
          onClick: (e) => {
            e.stopPropagation();
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: isMobileLayout ? '1.75rem' : '2.5rem',
            color: themeColors.success,
            textAlign: 'center',
            padding: isMobileLayout ? '24px 16px 12px' : '32px 24px 16px',
          }}
        >
          You Finished the Video!
        </DialogTitle>
        <DialogContent
          sx={{
            padding: '0 24px 24px',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: isMobileLayout ? '1.125rem' : '1.5rem',
              color: themeColors.text,
              marginBottom: 2,
              lineHeight: 1.6,
            }}
          >
            Great job watching the video!
          </Typography>

          {watchResult && (
            <Box sx={{ marginTop: 2 }}>
              {watchResult.starsJustAwarded && !watchResult.isReplay ? (
                // Stars were JUST awarded in this watch (explore videos)
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="52"
                    height="52"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ fill: themeColors.accent, color: themeColors.accent }}
                  >
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                  </svg>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ fill: themeColors.accent, color: themeColors.accent }}
                    >
                      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                    </svg>
                    <Typography
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontSize: '1.8rem',
                        color: themeColors.success,
                        fontWeight: 700,
                        marginBottom: 1,
                      }}
                    >
                      You earned {watchResult.starsToAward} stars!
                    </Typography>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ fill: themeColors.accent, color: themeColors.accent }}
                    >
                      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                    </svg>
                  </Box>
                </Box>
              ) : watchResult.starsWereAlreadyAwarded || starsAlreadyAwarded ? (
                // Stars were already earned before this watch
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ fill: themeColors.accent, color: themeColors.accent }}
                  >
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                  </svg>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: '1.3rem',
                      color: themeColors.warning,
                      fontWeight: 600,
                    }}
                  >
                    Stars already earned for this video!
                  </Typography>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ fill: themeColors.accent, color: themeColors.accent }}
                  >
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                  </svg>
                </Box>
              ) : watchResult.isReplay ? (
                // Replay video - no stars
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1.3rem',
                    color: themeColors.textSecondary,
                    fontWeight: 600,
                  }}
                >
                  Great job watching the replay! 🎬
                </Typography>
              ) : (
                // Still need to watch more times (journey videos)
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1.3rem',
                    color: themeColors.textSecondary,
                    fontWeight: 600,
                  }}
                >
                  Watch {watchResult.requiredWatchCount - (watchResult.videoWatch?.watchCount || 0)} more time{watchResult.requiredWatchCount - (watchResult.videoWatch?.watchCount || 0) > 1 ? 's' : ''} to earn up to {watchResult.starsForNextSession ?? watchResult.starsToAward ?? 0} stars next!
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            padding: '16px 24px 24px',
            justifyContent: 'center',
          }}
        >
          <Button
            onClick={handleCompletionDialogClose}
            variant="contained"
            sx={{
              backgroundColor: themeColors.secondary,
              color: themeColors.textInverse,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              textTransform: 'none',
              padding: '16px 48px',
              fontSize: '1.5rem',
              borderRadius: '16px',
              '&:hover': {
                backgroundColor: themeColors.primary,
                transform: 'scale(1.05)',
              },
            }}
          >
            {hasFollowUpContent ? 'Continue' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VideoPlayerModal;
