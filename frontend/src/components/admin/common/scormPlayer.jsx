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
  LinearProgress,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import SCORMAPI from '../../../services/scormAPI';
import { launchScorm } from '../../../services/scormService';
import { useAuth } from '../../../hooks/userHook';
import { themeColors } from '../../../config/themeColors';

/**
 * ScormPlayer Component
 * 
 * Persistent modal component for displaying and interacting with SCORM content.
 * Handles SCORM package loading, API injection, progress tracking, and completion.
 * 
 * @param {Boolean} open - Modal open state
 * @param {Function} onClose - Close handler
 * @param {String} contentId - Content item ID (AudioAssignment or Chant)
 * @param {String} contentType - Content type ('audioAssignment' or 'chant')
 * @param {String} contentTitle - Content title for display (optional)
 * @param {Function} onComplete - Callback when SCORM completes
 * @param {Function} onProgress - Callback for progress updates
 */
const ScormPlayer = ({
  open,
  onClose,
  contentId,
  contentType,
  contentTitle = 'SCORM Content',
  onComplete,
  onProgress,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
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

      const response = await launchScorm(contentId, contentType);
      
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
        // SCORM content looks for window.API (SCORM 1.2) or window.API_1484_11 (SCORM 2004)
        iframeWindow.API = api;
        iframeWindow.API_1484_11 = api; // SCORM 2004 compatibility
        
        // Also try parent window (some SCORM content looks for parent.API)
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
              if (onComplete) {
                onComplete({
                  status,
                  score: score ? parseFloat(score) : null,
                  timeSpent: time,
                });
              }
            }
          }

          // Call progress callback
          if (onProgress) {
            onProgress({
              status,
              score: score ? parseFloat(score) : null,
              timeSpent: time,
            });
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
   * Handle modal close
   */
  const handleClose = () => {
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
    onClose();
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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen={false}
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '16px',
          fontFamily: 'Quicksand, sans-serif',
          maxHeight: '90vh',
          backgroundColor: themeColors.bgCard,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `1px solid ${theme.palette.border.main}`,
          backgroundColor: themeColors.bgCard,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography
            component="span"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              color: themeColors.text,
            }}
          >
            {contentTitle}
          </Typography>
          {apiInitialized && (
            <Chip
              label={getStatusLabel(currentStatus)}
              size="small"
              sx={{
                backgroundColor: getStatusColor(currentStatus),
                color: themeColors.textInverse,
                fontWeight: 600,
                fontFamily: 'Quicksand, sans-serif',
              }}
            />
          )}
          {isCompleted && (
            <CheckCircleIcon
              sx={{
                color: themeColors.success,
                fontSize: '1.5rem',
              }}
            />
          )}
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: themeColors.text,
            '&:hover': {
              backgroundColor: themeColors.bgTertiary,
            },
          }}
        >
          <CloseIcon />
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
                marginBottom: 2,
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: themeColors.textSecondary,
                fontSize: '1rem',
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
              }}
            >
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={loadScormContent}
              sx={{
                marginTop: 2,
                backgroundColor: themeColors.secondary,
                color: themeColors.textInverse,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: theme.palette.secondary.dark,
                },
              }}
            >
              Retry
            </Button>
          </Box>
        )}

        {/* Progress Info Bar */}
        {apiInitialized && !error && (
          <Box
            sx={{
              padding: 2,
              backgroundColor: themeColors.bgCard,
              borderBottom: `1px solid ${theme.palette.border.main}`,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {currentScore !== null && (
              <Chip
                label={`Score: ${currentScore}%`}
                size="small"
                sx={{
                  backgroundColor: themeColors.accent,
                  color: themeColors.textInverse,
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                }}
              />
            )}
            <Chip
              label={`Time: ${timeSpent}`}
              size="small"
              sx={{
                backgroundColor: themeColors.bgTertiary,
                color: themeColors.text,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
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
          padding: 2,
          borderTop: `1px solid ${theme.palette.border.main}`,
          backgroundColor: themeColors.bgCard,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {apiInitialized && (
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.875rem',
                color: themeColors.textSecondary,
              }}
            >
              Progress is saved automatically
            </Typography>
          )}
        </Box>
        <Button
          onClick={handleClose}
          variant="contained"
          sx={{
            backgroundColor: themeColors.secondary,
            color: themeColors.textInverse,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            padding: '8px 24px',
            '&:hover': {
              backgroundColor: theme.palette.secondary.dark,
            },
          }}
        >
          {isCompleted ? 'Close' : 'Close & Save Progress'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScormPlayer;
