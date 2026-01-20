import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import ScormPlayer from './ScormPlayer';
import useCourseProgress from '../../../hooks/courseProgressHook';
import useExploreVideoWatch from '../../../hooks/exploreVideoWatchHook';
import ChildDialogBox from '../../common/ChildDialogBox';
import { useDispatch } from 'react-redux';
import { updateChildStats } from '../../../store/slices/userSlice';
import courseProgressService from '../../../services/courseProgressService';

// Confirmation Dialog Component
const ConfirmCloseDialog = ({ open, onConfirm, onCancel, title }) => (
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
        Do you want to close this video? Your progress will be saved!
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
  videoType = null,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const autoCloseTimerRef = useRef(null); // Ref to track auto-close timer
  const completionDialogShownRef = useRef(false); // Track if completion dialog has been shown for this video
  const [videoEnded, setVideoEnded] = useState(false);
  const [scormOpen, setScormOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [watchResult, setWatchResult] = useState(null);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  const [hasRecordedWatch, setHasRecordedWatch] = useState(false); // Prevent duplicate watch recording
  const [isClosingModal, setIsClosingModal] = useState(false); // Track if we're closing the modal

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

  /**
   * Update child stats in sessionStorage and Redux
   * This ensures the header and other components show updated stars immediately
   * @param {Number} totalStars - New total stars value
   */
  const updateChildStatsInStorage = (totalStars) => {
    if (!childId || totalStars === undefined || totalStars === null) {
      console.warn('[VideoPlayer] Cannot update child stats: missing childId or totalStars');
      return;
    }

    try {
      console.log(`[VideoPlayer] Updating child stats for ${childId} with totalStars: ${totalStars}`);

      // Update childProfiles in sessionStorage
      const childProfilesStr = sessionStorage.getItem('childProfiles');
      if (childProfilesStr) {
        const childProfiles = JSON.parse(childProfilesStr);
        const childIndex = childProfiles.findIndex(
          (child) => child._id === childId || child._id?.toString() === childId.toString()
        );

        if (childIndex !== -1) {
          // Update the child's stats
          if (!childProfiles[childIndex].stats) {
            childProfiles[childIndex].stats = {};
          }
          childProfiles[childIndex].stats.totalStars = totalStars;

          // Save back to sessionStorage
          sessionStorage.setItem('childProfiles', JSON.stringify(childProfiles));
          console.log(`[VideoPlayer] Updated childProfiles in sessionStorage`);
        }
      }

      // Update selectedChild in sessionStorage
      const selectedChildStr = sessionStorage.getItem('selectedChild');
      if (selectedChildStr) {
        const selectedChild = JSON.parse(selectedChildStr);
        if (selectedChild._id === childId || selectedChild._id?.toString() === childId.toString()) {
          if (!selectedChild.stats) {
            selectedChild.stats = {};
          }
          selectedChild.stats.totalStars = totalStars;
          sessionStorage.setItem('selectedChild', JSON.stringify(selectedChild));
          console.log(`[VideoPlayer] Updated selectedChild in sessionStorage`);
        }
      }

      // Update Redux store
      dispatch(updateChildStats({
        childId,
        stats: { totalStars },
      }));
      console.log(`[VideoPlayer] Updated Redux store with new totalStars`);

      // Dispatch event to notify components (like ChilHeader) to refresh
      window.dispatchEvent(new Event('childStatsUpdated'));
      console.log(`[VideoPlayer] Dispatched childStatsUpdated event`);
    } catch (error) {
      console.error('[VideoPlayer] Error updating child stats in storage:', error);
    }
  };

  /**
   * Get current totalStars from sessionStorage
   * @returns {Number} Current totalStars or 0
   */
  const getCurrentTotalStars = () => {
    try {
      const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
      const child = childProfiles.find(c => c._id === childId || c._id?.toString() === childId.toString());

      if (child && child.stats) {
        return child.stats.totalStars || 0;
      }

      // Fallback: try selectedChild
      const selectedChild = JSON.parse(sessionStorage.getItem('selectedChild') || '{}');
      if (selectedChild.stats) {
        return selectedChild.stats.totalStars || 0;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  };

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

  // Get video URL
  useEffect(() => {
    if (video && open) {
      const getVideoUrl = () => {
        if (!video.url && !video.filePath) return null;

        // If already a full URL, return as-is
        if (video.url && (video.url.startsWith('http://') || video.url.startsWith('https://'))) {
          return video.url;
        }

        // Build full URL from relative path
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const path = video.url || video.filePath;
        return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      };

      const newVideoUrl = getVideoUrl();

      // Only reset states if the video URL actually changed (new video)
      // Don't reset if completion dialog has been shown (video just finished)
      if (newVideoUrl !== videoUrl && !completionDialogShownRef.current) {
        setVideoUrl(newVideoUrl);
        setVideoEnded(false);
        setScormOpen(false);
        setShowConfirmClose(false);
        setVideoLoaded(false);
        setVideoPlaying(false);
        setShowCompletionDialog(false);
        setWatchResult(null);
        setIsRecordingWatch(false);
        setHasRecordedWatch(false); // Reset watch recording flag when video changes
        setStarsAlreadyAwarded(false);
        setWatchStatusBefore(null);
        setIsClosingModal(false); // Reset closing state when video changes
        // Clear auto-close timer when video changes
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = null;
        }
        // Reset completion dialog shown flag for new video
        completionDialogShownRef.current = false;
      } else if (newVideoUrl !== videoUrl) {
        // Video URL changed but completion dialog is showing - just update URL, don't reset states
        setVideoUrl(newVideoUrl);
      }
    }
  }, [video, open, videoUrl, showCompletionDialog]);

  // Auto-play video when loaded
  useEffect(() => {
    if (videoRef.current && videoUrl && open && !videoLoaded) {
      const videoElement = videoRef.current;

      const handleCanPlay = () => {
        setVideoLoaded(true);
        // Auto-play video
        videoElement.play()
          .then(() => {
            setVideoPlaying(true);
          })
          .catch((error) => {
            console.error('Error auto-playing video:', error);
            // If autoplay fails, show play button (but still disable controls)
          });
      };

      const handlePlay = () => {
        setVideoPlaying(true);
      };

      const handlePause = () => {
        // Prevent pausing - resume immediately
        if (videoElement.paused && !videoEnded) {
          videoElement.play().catch(console.error);
        }
      };

      const handleSeeking = () => {
        // Prevent seeking - reset to current play position
        if (!videoEnded) {
          const currentTime = videoElement.currentTime;
          videoElement.currentTime = currentTime;
        }
      };

      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);
      videoElement.addEventListener('seeking', handleSeeking);
      videoElement.addEventListener('seeked', handleSeeking);

      return () => {
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
        videoElement.removeEventListener('seeking', handleSeeking);
        videoElement.removeEventListener('seeked', handleSeeking);
      };
    }
  }, [videoRef, videoUrl, open, videoLoaded, videoEnded]);

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

          // Check if stars were already awarded BEFORE this watch
          const starsWereAlreadyAwarded = watchStatusBefore?.starsAwarded || false;
          const watchCountBefore = watchStatusBefore?.currentWatchCount || 0;
          const requiredWatchCount = watchStatusBefore?.requiredWatchCount || 5;

          // Mark video as watched (100% completion)
          result = await markVideoWatched(videoId, 100);

          // Determine if stars were JUST awarded in this watch
          // Stars were just awarded if:
          // 1. They weren't awarded before this watch
          // 2. The watch count after is >= required count
          // 3. The result says stars were awarded
          const watchCountAfter = result?.videoWatch?.watchCount || 0;
          const starsJustAwarded = result?.starsAwarded && result?.starsAwardedAt &&
            !starsWereAlreadyAwarded &&
            watchCountAfter >= requiredWatchCount;

          // Update result to reflect if stars were just awarded or already earned
          const updatedResult = {
            ...result,
            starsJustAwarded, // New flag to indicate stars were just awarded
            starsWereAlreadyAwarded, // Flag to indicate stars were already earned
          };

          setWatchResult(updatedResult);

          // Update child stats in sessionStorage and Redux if stars were JUST awarded
          // This ensures the header updates immediately without page reload
          if (starsJustAwarded && result.starsToAward) {
            const currentTotalStars = getCurrentTotalStars();
            const newTotalStars = currentTotalStars + result.starsToAward;
            updateChildStatsInStorage(newTotalStars);
          }

          // Only update course progress if stars were JUST awarded (not already earned)
          // This ensures videos are only marked as completed in course progress when fully watched
          // Use service directly to avoid unnecessary refreshes (updateProgress hook calls fetchChildCourses)
          if (courseId && starsJustAwarded) {
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

  // Handle SCORM start
  const handleStartScorm = () => {
    setScormOpen(true);
  };

  // Handle close attempt - show confirmation
  const handleCloseAttempt = () => {
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
    // Only set up auto-close for explore videos without SCORM
    // Replay videos also get auto-close (they're explore videos too)
    if (showCompletionDialog && !hasScorm && isExploreVideo) {
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
  }, [showCompletionDialog, hasScorm, isExploreVideo]);

  // Handle completion dialog close (manual close via button or auto-close)
  const handleCompletionDialogClose = () => {
    console.log('[VideoPlayer] handleCompletionDialogClose called');

    // Clear auto-close timer if it exists (user clicked close button)
    if (autoCloseTimerRef.current) {
      console.log('[VideoPlayer] Clearing auto-close timer (manual close)');
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    // If video has SCORM, keep modal open so user can start SCORM activity
    // Don't call onVideoComplete or close modal yet
    if (hasScorm) {
      setShowCompletionDialog(false);
      // Modal stays open, user can click "Start Interactive Activity" button
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

  // Get video ID
  const videoId = video?._id || video?._contentId || video?.contentId || video?.id;

  return (
    <>
      <Dialog
        open={open && !scormOpen && !showCompletionDialog && !isClosingModal}
        onClose={handleCloseAttempt}
        maxWidth="lg"
        fullWidth
        disableEscapeKeyDown={true}
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: '20px',
            fontFamily: 'Quicksand, sans-serif',
            maxHeight: '90vh',
            backgroundColor: themeColors.bgCard,
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
            padding: 4,
            backgroundColor: themeColors.bgCard,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '2rem',
              color: themeColors.primary,
            }}
          >
            {video?.title || 'Video'}
          </Typography>
          <IconButton
            onClick={handleCloseAttempt}
            size="large"
            sx={{
              color: themeColors.orange,
              backgroundColor: themeColors.bgTertiary,
              borderRadius: '50%',
              padding: '12px',
              '&:hover': {
                backgroundColor: themeColors.orange,
                color: themeColors.textInverse,
                transform: 'scale(1.1)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: '2rem' }} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            padding: 0,
            backgroundColor: '#000',
            position: 'relative',
            minHeight: '500px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                controls={false}
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '70vh',
                  pointerEvents: 'none', // Disable all touch/interaction
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
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: themeColors.textInverse,
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    }}
                  >
                    Recording your progress...
                  </Typography>
                </Box>
              )}

              {/* SCORM Start Button - Shows after video ends */}
              {videoEnded && hasScorm && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={handleStartScorm}
                    startIcon={<PlayArrowIcon sx={{ fontSize: '2rem' }} />}
                    sx={{
                      backgroundColor: themeColors.secondary,
                      color: themeColors.textInverse,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 700,
                      textTransform: 'none',
                      padding: '16px 48px',
                      fontSize: '1.8rem',
                      borderRadius: '16px',
                      boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.3)',
                      '&:hover': {
                        backgroundColor: themeColors.primary,
                        transform: 'scale(1.08)',
                        boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.4)',
                      },
                    }}
                  >
                    Start Interactive Activity
                  </Button>
                </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                color: themeColors.textInverse,
              }}
            >
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
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            padding: 2,
            backgroundColor: themeColors.bgCard,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={handleCloseAttempt}
            variant="contained"
            sx={{
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
            }}
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

      {/* Confirmation Dialog */}
      <ConfirmCloseDialog
        open={showConfirmClose}
        onConfirm={handleConfirmedClose}
        onCancel={handleCancelClose}
        title="Close Video?"
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
            fontSize: '2.5rem',
            color: themeColors.success,
            textAlign: 'center',
            padding: '32px 24px 16px',
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
              fontSize: '1.5rem',
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
                  Watch {watchResult.requiredWatchCount - (watchResult.videoWatch?.watchCount || 0)} more time{watchResult.requiredWatchCount - (watchResult.videoWatch?.watchCount || 0) > 1 ? 's' : ''} to earn {watchResult.starsToAward} stars!
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
            {hasScorm ? 'Continue' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VideoPlayerModal;
