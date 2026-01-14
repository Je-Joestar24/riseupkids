import React, { useEffect, useRef, useState } from 'react';
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
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
// SCORM API is now injected by wrapper HTML, no need to import
import { launchScorm } from '../../../services/scormService';
import { useAuth } from '../../../hooks/userHook';
import { themeColors } from '../../../config/themeColors';
import useCourseProgress from '../../../hooks/courseProgressHook';
import { useParams } from 'react-router-dom';
import axios from '../../../api/axios';

// Confirmation Dialog Component
const ConfirmCloseDialog = ({ open, onConfirm, onCancel, title, isCompleted }) => (
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
        {isCompleted
          ? 'Great job! Your progress has been saved. Do you want to close this activity?'
          : 'Do you want to close this activity? Your progress will be saved!'}
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
            borderWidth: '3px',
            backgroundColor: themeColors.bgTertiary,
          },
        }}
      >
        Keep Learning
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
 * ScormPlayer Component (Child-facing)
 * 
 * Persistent modal component for displaying and interacting with SCORM content.
 * Handles SCORM package loading, API injection, progress tracking, and completion.
 * Updates course progress when SCORM completes.
 * 
 * @param {Boolean} open - Modal open state
 * @param {Function} onClose - Close handler
 * @param {String} contentId - Content item ID (Book, Chant, or Video/Media)
 * @param {String} contentType - Content type ('book', 'chant', or 'video')
 * @param {String} contentTitle - Content title for display (optional)
 * @param {Function} onComplete - Callback when SCORM completes
 */
const ScormPlayer = ({
  open,
  onClose,
  contentId,
  contentType,
  contentTitle = 'SCORM Content',
  onComplete,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { id: childId } = useParams();
  const { updateProgress } = useCourseProgress(childId);
  
  const iframeRef = useRef(null);
  // API is now injected by wrapper HTML, no need for apiRef
  const progressIntervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scormUrl, setScormUrl] = useState(null);
  const [apiInitialized, setApiInitialized] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('not attempted');
  const [currentScore, setCurrentScore] = useState(null);
  const [maxScore, setMaxScore] = useState(null); // Track max score for completion check
  const [timeSpent, setTimeSpent] = useState('00:00:00.00');
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0); // Track time in seconds for completion check
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState(null);
  
  // Estimated minimum time for completion (60 seconds)
  const estimatedMinTime = 60;

  // Get courseId from URL params or context
  const { courseId } = useParams();

  // Load SCORM launch URL when modal opens
  useEffect(() => {
    if (open && contentId && contentType) {
      loadScormContent();
    } else {
      // Cleanup when modal closes
      cleanup();
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentId, contentType]);

  // Add beforeunload warning when modal is open
  useEffect(() => {
    if (open) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your progress may be lost.';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [open]);

  /**
   * Load SCORM content and get launch URL
   */
  const loadScormContent = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsCompleted(false);
      setCurrentStatus('not attempted');
      setCurrentScore(null);
      setMaxScore(null);
      setTimeSpent('00:00:00.00');
      setTimeSpentSeconds(0);
      setIsCompleted(false);
      setCompletionError(null);

      // Map contentType to backend format
      const backendContentType = contentType === 'video' ? 'video' : 
                                  contentType === 'book' ? 'book' :
                                  contentType === 'chant' ? 'chant' : 
                                  contentType === 'audioAssignment' ? 'audioAssignment' : contentType;

      const response = await launchScorm(contentId, backendContentType);
      
      if (response.success && response.data.launchUrl) {
        setScormUrl(response.data.launchUrl);
      } else {
        throw new Error('Failed to get SCORM launch URL');
      }
    } catch (err) {
      console.error('Error loading SCORM content:', err);
      setError(err.message || 'Failed to load SCORM content');
      setLoading(false);
    }
  };

  /**
   * Monitor iframe load and listen for postMessage updates from wrapper
   */
  useEffect(() => {
    if (!scormUrl || !iframeRef.current) return;

    const iframe = iframeRef.current;
    
    const handleIframeLoad = () => {
      // Wrapper is loaded, API will be injected by wrapper
      // Just wait a moment for initialization
      setTimeout(() => {
        setApiInitialized(true);
        setLoading(false);
      }, 1000);
    };

    // Listen for postMessage from wrapper
    const handleMessage = (event) => {
      // Verify message is from our SCORM wrapper (same origin)
      if (event.data && event.data.type === 'SCORM_PROGRESS') {
        const { 
          status, 
          score, 
          scoreMax,
          timeSpent, 
          exit, 
          lessonLocation,
          suspendData,
          isCompleted: completedFromMessage,
          isLastSlide: isLastSlideFromMessage,
          isLastVideoPlaying: isLastVideoPlayingFromMessage,
          isScormEnded: isScormEndedFromMessage,
          lastVideoFilename
        } = event.data.data;
        
        setCurrentStatus(status || 'not attempted');
        setCurrentScore(score);
        setMaxScore(scoreMax !== undefined ? scoreMax : null);
        setTimeSpent(timeSpent || '00:00:00.00');
        
        // Parse time to seconds for completion check
        if (timeSpent && event.data.data.timeSpentSeconds !== undefined) {
          setTimeSpentSeconds(event.data.data.timeSpentSeconds);
        } else if (timeSpent && timeSpent !== '00:00:00.00') {
          // Parse time string to seconds (HH:MM:SS.SS format)
          const parts = timeSpent.split(':');
          if (parts.length >= 3) {
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            setTimeSpentSeconds(hours * 3600 + minutes * 60 + seconds);
          }
        }
        
        // Log for debugging (NO auto-completion)
        if (isLastVideoPlayingFromMessage) {
          console.log('[SCORM] Last video is playing:', lastVideoFilename);
        }
        
        if (isScormEndedFromMessage) {
          console.log('[SCORM] ✅ SCORM flow has fully ended - final image reached! (logged only)');
        }
        
        // Log completion data for debugging
        console.log('[SCORM Progress] Status:', status, 'Score:', score, 'Time:', timeSpent, 
                   'Last video:', isLastVideoPlayingFromMessage, 'Final image:', isScormEndedFromMessage);
        
        // REMOVED: All auto-completion logic
        // User must click "Done" button to trigger completion check
      }
    };

    iframe.addEventListener('load', handleIframeLoad);
    window.addEventListener('message', handleMessage);

    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
      window.removeEventListener('message', handleMessage);
    };
  }, [scormUrl, contentId, contentType, user, courseId, childId, onComplete]);

  // Progress monitoring is now handled via postMessage from wrapper
  // No need for startProgressMonitoring function anymore

  /**
   * Cleanup on unmount or close
   */
  const cleanup = () => {
    // Clear progress monitoring
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Send message to wrapper to finish SCORM session
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Send finish message to wrapper via postMessage
        iframe.contentWindow.postMessage({
          type: 'SCORM_FINISH'
        }, '*');
      }
    } catch (err) {
      console.error('Error finishing SCORM session:', err);
    }

    // Reset state
    setScormUrl(null);
    setApiInitialized(false);
    setLoading(true);
    setError(null);
    setIsCompleted(false);
  };

  /**
   * Parse time string to seconds
   */
  const parseTimeToSeconds = (timeString) => {
    if (!timeString || timeString === '00:00:00.00') {
      return 0;
    }
    const parts = timeString.split(':');
    if (parts.length >= 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseFloat(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };

  /**
   * Handle "Done" button click - check completion requirements
   */
  const handleDoneClick = async () => {
    setIsCheckingCompletion(true);
    setCompletionError(null);
    
    try {
      const response = await axios.post(`/scorm/${contentId}/check-completion`, {
        contentType: contentType,
      });
      
      const data = response.data;
      
      if (data.success && data.canComplete) {
        // Completion validated - show success and close
        setIsCompleted(true);
        
        // Update course progress
        if (courseId && childId) {
          updateProgress(courseId, contentId, contentType)
            .then(() => {
              console.log('Course progress updated after SCORM completion');
            })
            .catch((err) => {
              console.error('Failed to update course progress:', err);
            });
        }
        
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete({
            status: data.data.status || 'completed',
            score: data.data.score,
            timeSpent: timeSpent,
            isLastSlide: true,
            isScormEnded: true,
            starsAwarded: data.data.starsAwarded,
            starsToAward: data.data.starsToAward,
            readingCount: data.data.readingCount,
            totalStars: data.data.totalStars,
          });
        }
        
        // Close after a short delay to show success
        setTimeout(() => {
          handleConfirmedClose();
        }, 1500);
      } else {
        // Requirements not met - show error message
        setCompletionError(data.message || 'Please spend more time reading the book before completing.');
      }
    } catch (err) {
      console.error('Error checking completion:', err);
      setCompletionError(err.response?.data?.message || 'Failed to check completion. Please try again.');
    } finally {
      setIsCheckingCompletion(false);
    }
  };

  /**
   * Handle modal close attempt - show confirmation
   */
  const handleCloseAttempt = () => {
    if (isCompleted) {
      // Already completed, just close
      handleConfirmedClose();
    } else {
      // Not completed, show confirmation
      setShowConfirmClose(true);
    }
  };

  /**
   * Handle confirmed close
   */
  const handleConfirmedClose = () => {
    // Send message to wrapper to save and finish SCORM session
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Send save message first, then finish
        iframe.contentWindow.postMessage({
          type: 'SCORM_SAVE'
        }, '*');
        
        // Small delay before finish to ensure save completes
        setTimeout(() => {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'SCORM_FINISH'
            }, '*');
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error saving progress on close:', err);
    }
    
    cleanup();
    setShowConfirmClose(false);
    onClose();
  };

  /**
   * Handle cancel close
   */
  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'passed':
        return themeColors.success;
      case 'failed':
        return themeColors.error;
      case 'incomplete':
      case 'browsed':
        return themeColors.accent;
      default:
        return themeColors.textMuted;
    }
  };

  /**
   * Get status label
   */
  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'passed':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'incomplete':
        return 'In Progress';
      case 'browsed':
        return 'Browsed';
      default:
        return 'Not Attempted';
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCloseAttempt}
        maxWidth="lg"
        fullWidth
        fullScreen={false}
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
          borderBottom: `4px solid ${themeColors.secondary}`,
          backgroundColor: themeColors.bgCard,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap' }}>
          <Typography
            component="span"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '2rem',
              color: themeColors.primary,
            }}
          >
            {contentTitle}
          </Typography>
          {apiInitialized && (
            <Chip
              label={getStatusLabel(currentStatus)}
              sx={{
                backgroundColor: getStatusColor(currentStatus),
                color: themeColors.textInverse,
                fontWeight: 700,
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1.1rem',
                padding: '8px 16px',
                height: 'auto',
                border: `3px solid ${themeColors.textInverse}`,
              }}
            />
          )}
          {isCompleted && (
            <CheckCircleIcon
              sx={{
                color: themeColors.success,
                fontSize: '2.5rem',
              }}
            />
          )}
        </Box>
        <IconButton
          onClick={handleCloseAttempt}
          size="large"
          sx={{
            color: themeColors.orange,
            backgroundColor: themeColors.bgTertiary,
            borderRadius: '12px',
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
          backgroundColor: themeColors.bgSecondary,
          position: 'relative',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Loading State */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeColors.bgCard,
              zIndex: 10,
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
                color: themeColors.textSecondary,
                fontSize: '1.8rem',
                fontWeight: 600,
              }}
            >
              Loading SCORM content...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box
            sx={{
              padding: 3,
              backgroundColor: themeColors.bgCard,
            }}
          >
            <Alert
              severity="error"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1.3rem',
                fontWeight: 600,
              }}
            >
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={loadScormContent}
              sx={{
                marginTop: 3,
                backgroundColor: themeColors.secondary,
                color: themeColors.textInverse,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '1.3rem',
                textTransform: 'none',
                padding: '12px 32px',
                borderRadius: '12px',
                border: `3px solid ${themeColors.primary}`,
                '&:hover': {
                  backgroundColor: themeColors.primary,
                  transform: 'scale(1.05)',
                },
              }}
            >
              Try Again
            </Button>
          </Box>
        )}
{/* 
        {apiInitialized && !error && (
          <Box
            sx={{
              padding: 3,
              backgroundColor: themeColors.bgCard,
              borderBottom: `4px solid ${themeColors.secondary}`,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {currentScore !== null && (
              <Chip
                label={`Score: ${currentScore}%`}
                sx={{
                  backgroundColor: themeColors.accent,
                  color: themeColors.textInverse,
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  padding: '10px 20px',
                  height: 'auto',
                  border: `3px solid ${themeColors.textInverse}`,
                }}
              />
            )}
            <Chip
              label={`Time: ${timeSpent}`}
              sx={{
                backgroundColor: themeColors.bgTertiary,
                color: themeColors.text,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '1.2rem',
                padding: '10px 20px',
                height: 'auto',
                border: `3px solid ${themeColors.secondary}`,
              }}
            />
          </Box>
        )} */}

        {/* SCORM Content Iframe */}
        {scormUrl && !error && (
          <Box
            sx={{
              flex: 1,
              position: 'relative',
              backgroundColor: '#000',
              display: loading ? 'none' : 'block',
            }}
          >
            <iframe
              ref={iframeRef}
              src={scormUrl}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '600px',
                border: 'none',
                display: 'block',
              }}
              title="SCORM Content"
              allow="fullscreen"
              // Removed sandbox to allow full window access (same-origin, so it's safe)
              // The SCORM content needs to access window.parent.open without restrictions
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `4px solid ${themeColors.secondary}`,
          backgroundColor: themeColors.bgCard,
          justifyContent: 'space-between',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Completion Error Message */}
        {completionError && (
          <Alert
            severity="warning"
            sx={{
              width: '100%',
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '1.2rem',
              fontWeight: 600,
            }}
            onClose={() => setCompletionError(null)}
          >
            {completionError}
          </Alert>
        )}
        
        {/* Button Group */}
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleCloseAttempt}
            variant="outlined"
            disabled={isCheckingCompletion}
            sx={{
              borderColor: themeColors.secondary,
              color: themeColors.secondary,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              textTransform: 'none',
              padding: '12px 32px',
              fontSize: '1.3rem',
              borderRadius: '12px',
              borderWidth: '3px',
              '&:hover': {
                borderWidth: '3px',
                backgroundColor: themeColors.bgTertiary,
                transform: 'scale(1.05)',
              },
            }}
          >
            Close
          </Button>
          
          <Button
            onClick={handleDoneClick}
            variant="contained"
            disabled={isCompleted || isCheckingCompletion || (timeSpentSeconds < estimatedMinTime && !(currentScore !== null && maxScore !== null && currentScore === maxScore))}
            sx={{
              backgroundColor: isCompleted ? themeColors.success : themeColors.secondary,
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
              '&:disabled': {
                backgroundColor: themeColors.textMuted,
                color: themeColors.text,
              },
            }}
          >
            {isCheckingCompletion ? 'Checking...' : isCompleted ? 'Completed ✓' : 'Done'}
          </Button>
        </Box>
        
        {/* Time Requirement Indicator */}
        {!isCompleted && timeSpentSeconds < estimatedMinTime && !(currentScore !== null && maxScore !== null && currentScore === maxScore) && (
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '1.1rem',
              color: themeColors.textSecondary,
              textAlign: 'center',
              width: '100%',
            }}
          >
            Please read for at least {estimatedMinTime} seconds ({timeSpentSeconds}s / {estimatedMinTime}s)
          </Typography>
        )}
        
        {/* Max Score Reached Indicator */}
        {!isCompleted && currentScore !== null && maxScore !== null && currentScore === maxScore && (
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '1.1rem',
              color: themeColors.success,
              textAlign: 'center',
              width: '100%',
              fontWeight: 600,
            }}
          >
            ✓ Maximum score reached! You can complete the activity now.
          </Typography>
        )}
      </DialogActions>
    </Dialog>

    {/* Confirmation Dialog */}
    <ConfirmCloseDialog
      open={showConfirmClose}
      onConfirm={handleConfirmedClose}
      onCancel={handleCancelClose}
      title={isCompleted ? 'Activity Completed!' : 'Close Activity?'}
      isCompleted={isCompleted}
    />
    </>
  );
};

export default ScormPlayer;
