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
import SCORMAPI from '../../../services/scormAPI';
import { launchScorm } from '../../../services/scormService';
import { useAuth } from '../../../hooks/userHook';
import { themeColors } from '../../../config/themeColors';
import useCourseProgress from '../../../hooks/courseProgressHook';
import { useParams } from 'react-router-dom';

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
          borderColor: themeColors.orange,
          color: themeColors.orange,
          borderWidth: '3px',
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
  const apiRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scormUrl, setScormUrl] = useState(null);
  const [apiInitialized, setApiInitialized] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('not attempted');
  const [currentScore, setCurrentScore] = useState(null);
  const [timeSpent, setTimeSpent] = useState('00:00:00.00');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

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
      setTimeSpent('00:00:00.00');

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
   * Inject SCORM API into iframe when it loads
   */
  useEffect(() => {
    if (!scormUrl || !iframeRef.current) return;

    const iframe = iframeRef.current;
    
    const handleIframeLoad = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) {
          throw new Error('Cannot access iframe window');
        }

        // Initialize SCORM API
        const api = new SCORMAPI(contentId, contentType, user?._id);
        apiRef.current = api;

        // Inject API into iframe
        iframeWindow.API = api;
        iframeWindow.API_1484_11 = api; // SCORM 2004 compatibility
        
        // Also try parent window (for nested iframes)
        try {
          if (iframeWindow.parent && iframeWindow.parent !== window) {
            iframeWindow.parent.API = api;
            iframeWindow.parent.API_1484_11 = api;
          }
        } catch (e) {
          // Cross-origin restriction - that's okay
          console.warn('Cannot set parent.API (cross-origin):', e);
        }

        // Initialize SCORM API
        const initResult = api.LMSInitialize('');
        if (initResult === 'true') {
          setApiInitialized(true);
          setLoading(false);
          
          // Start monitoring progress
          startProgressMonitoring();
        } else {
          throw new Error('SCORM API initialization failed');
        }
      } catch (err) {
        console.error('Failed to inject SCORM API:', err);
        setError('Failed to initialize SCORM content. Please try again.');
        setLoading(false);
      }
    };

    iframe.addEventListener('load', handleIframeLoad);

    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [scormUrl, contentId, contentType, user]);

  /**
   * Monitor SCORM progress
   */
  const startProgressMonitoring = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      const api = apiRef.current;
      if (api && api.initialized) {
        try {
          const status = api.LMSGetValue('cmi.core.lesson_status');
          const score = api.LMSGetValue('cmi.core.score.raw');
          const time = api.LMSGetValue('cmi.core.total_time');

          setCurrentStatus(status || 'not attempted');
          setCurrentScore(score ? parseFloat(score) : null);
          setTimeSpent(time || '00:00:00.00');

          // Check if completed
          if (status === 'completed' || status === 'passed') {
            if (!isCompleted) {
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

              if (onComplete) {
                onComplete({
                  status,
                  score: score ? parseFloat(score) : null,
                  timeSpent: time,
                });
              }
            }
          }
        } catch (err) {
          console.error('Error monitoring SCORM progress:', err);
        }
      }
    }, 3000); // Check every 3 seconds
  };

  /**
   * Cleanup on unmount or close
   */
  const cleanup = () => {
    // Clear progress monitoring
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Finish SCORM API
    if (apiRef.current && apiRef.current.initialized) {
      try {
        apiRef.current.LMSFinish('');
      } catch (err) {
        console.error('Error finishing SCORM API:', err);
      }
      apiRef.current = null;
    }

    // Reset state
    setScormUrl(null);
    setApiInitialized(false);
    setLoading(true);
    setError(null);
    setIsCompleted(false);
  };

  /**
   * Handle modal close attempt - show confirmation
   */
  const handleCloseAttempt = () => {
    setShowConfirmClose(true);
  };

  /**
   * Handle confirmed close
   */
  const handleConfirmedClose = () => {
    // Save progress before closing
    if (apiRef.current && apiRef.current.initialized) {
      try {
        apiRef.current.LMSCommit('');
        apiRef.current.LMSFinish('');
      } catch (err) {
        console.error('Error saving progress on close:', err);
      }
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
            border: `4px solid ${themeColors.secondary}`,
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
            border: `3px solid ${themeColors.orange}`,
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

        {/* Progress Info Bar */}
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
        )}

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
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
              title="SCORM Content"
              allow="fullscreen"
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
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {apiInitialized && (
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '1.2rem',
                fontWeight: 600,
                color: themeColors.primary,
              }}
            >
              Progress is saved automatically
            </Typography>
          )}
        </Box>
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
          {isCompleted ? 'Close' : 'Close & Save Progress'}
        </Button>
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
