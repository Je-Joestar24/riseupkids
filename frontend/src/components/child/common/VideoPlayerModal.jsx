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
 * @param {Boolean} open - Modal open state
 * @param {Function} onClose - Close handler
 * @param {Object} video - Video object with url, title, and optional scormFile
 * @param {Function} onVideoComplete - Callback when video finishes
 */
const VideoPlayerModal = ({
  open,
  onClose,
  video,
  onVideoComplete,
}) => {
  const theme = useTheme();
  const videoRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [scormOpen, setScormOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

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
    }
  }, [video, open]);

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
  const handleVideoEnd = () => {
    setVideoEnded(true);
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
    onClose();
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
                controls
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '70vh',
                }}
                onEnded={handleVideoEnd}
              />
              
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
    </>
  );
};

export default VideoPlayerModal;
