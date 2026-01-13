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
import ChildDialogBox from '../../common/ChildDialogBox';

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
 */
const VideoPlayerModal = ({
  open,
  onClose,
  video,
  onVideoComplete,
  childId,
  courseId,
}) => {
  const theme = useTheme();
  const videoRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [scormOpen, setScormOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [watchResult, setWatchResult] = useState(null);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  
  // Get video watch methods from hook
  const { markVideoWatched, updateProgress } = useCourseProgress(childId);

  // Check if video has SCORM file
  const hasScorm = !!(video?.scormFile || video?.scormFileUrl || video?.scormFilePath);

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

      setVideoUrl(getVideoUrl());
      setVideoEnded(false);
      setScormOpen(false);
      setShowConfirmClose(false);
      setVideoLoaded(false);
      setVideoPlaying(false);
      setShowCompletionDialog(false);
      setWatchResult(null);
      setIsRecordingWatch(false);
    }
  }, [video, open]);

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
    setVideoEnded(true);
    setVideoPlaying(false);
    
    // Get video ID
    const videoId = video?._id || video?._contentId || video?.contentId || video?.id;
    
    // Record video watch if childId is provided
    if (childId && videoId) {
      setIsRecordingWatch(true);
      try {
        // Mark video as watched (100% completion)
        const result = await markVideoWatched(videoId, 100);
        setWatchResult(result);
        
        // Only update course progress if stars were awarded (required watch count reached)
        // This ensures videos are only marked as completed in course progress when fully watched
        if (courseId && updateProgress && result?.starsAwarded) {
          try {
            await updateProgress(courseId, videoId, 'video');
          } catch (progressError) {
            console.error('Error updating course progress:', progressError);
            // Don't fail the whole flow if course progress update fails
          }
        }
        
        // Show completion dialog
        setShowCompletionDialog(true);
      } catch (error) {
        console.error('Error recording video watch:', error);
        // Still show completion dialog even if watch recording fails
        setShowCompletionDialog(true);
      } finally {
        setIsRecordingWatch(false);
      }
    } else {
      // No childId - just show completion dialog
      setShowCompletionDialog(true);
    }
    
    // Call original callback
    if (onVideoComplete) {
      onVideoComplete(video);
    }
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
    onClose();
  };

  // Handle completion dialog close
  const handleCompletionDialogClose = () => {
    setShowCompletionDialog(false);
    // If video has SCORM, don't close modal yet (user can start SCORM)
    // Otherwise, close modal
    if (!hasScorm) {
      handleConfirmedClose();
    }
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
        open={open && !scormOpen}
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
                onEnded={handleVideoEnd}
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
          elevation: 8,
          sx: {
            borderRadius: '20px',
            fontFamily: 'Quicksand, sans-serif',
            backgroundColor: themeColors.bgCard,
            padding: '8px',
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
          🎉 You Finished the Video! 🎉
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
              {watchResult.starsAwarded && watchResult.starsAwardedAt ? (
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1.8rem',
                    color: themeColors.success,
                    fontWeight: 700,
                    marginBottom: 1,
                  }}
                >
                  ⭐ You earned {watchResult.starsToAward} stars! ⭐
                </Typography>
              ) : (
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
