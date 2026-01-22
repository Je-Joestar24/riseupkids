import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Avatar,
  Typography,
  Button,
  Divider,
  IconButton,
  Slider,
  Stack,
  Paper,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  PlayArrowOutlined,
  PauseOutlined,
  VolumeUpOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  CancelOutlined,
} from '@mui/icons-material';

/**
 * CheckingAudioPlayRecordingModal Component
 * 
 * Modal for playing child's recorded audio submission
 * Displays child info and audio player
 * Uses environment variable for base URL to support deployment flexibility
 */
const CheckingAudioPlayRecordingModal = ({
  open,
  onClose,
  submission,
  onReview,
}) => {
  const theme = useTheme();
  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [reviewFeedback, setReviewFeedback] = React.useState('');

  // Get base URL from environment or use default
  const getAudioUrl = (relativePath) => {
    if (!relativePath) return '';
    
    // If URL is already absolute, return as is
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    
    // Build full URL with base URL
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${relativePath}`;
  };

  if (!submission) return null;

  const { child, audioAssignment, recordedAudio, timeSpent } = submission;
  const audioUrl = getAudioUrl(recordedAudio?.url);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (event, newValue) => {
    if (audioRef.current && isFinite(newValue) && newValue >= 0) {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (audioRef.current) {
      audioRef.current.volume = newValue;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleApprove = async () => {
    if (submission && onReview) {
      await onReview(
        submission.audioAssignment._id,
        submission.child._id,
        'approved',
        reviewFeedback
      );
      onClose();
      setReviewFeedback('');
    }
  };

  const handleReject = async () => {
    if (submission && onReview) {
      await onReview(
        submission.audioAssignment._id,
        submission.child._id,
        'rejected',
        reviewFeedback
      );
      onClose();
      setReviewFeedback('');
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const childInitial = child?.displayName?.[0]?.toUpperCase() || 'C';
  const assignmentTitle = audioAssignment?.title || 'Untitled Assignment';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx:{
          borderRadius: '16px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          fontSize: '1.125rem',
          color: theme.palette.text.primary,
          pb: 1.5,
          borderBottom: `1px solid ${theme.palette.border.main}`,
        }}
      >
        Play Recording
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ pt: 3 }}>
        {/* Child Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3,
          marginTop: 5, }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              fontSize: '1.5rem',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.orange.main}, ${theme.palette.orange.dark})`,
              color: '#fff',
            }}
          >
            {childInitial}
          </Avatar>
          <Box>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                fontSize: '1rem',
                color: theme.palette.text.primary,
              }}
            >
              {child?.displayName || 'Unknown Child'}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                mt: 0.5,
              }}
            >
              Age {child?.age || 'N/A'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Assignment Info */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 0.5,
            }}
          >
            Assignment
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.95rem',
              fontWeight: 500,
              color: theme.palette.text.primary,
            }}
          >
            {assignmentTitle}
          </Typography>
        </Box>

        {/* Time Spent */}
        {timeSpent && (
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
              }}
            >
              Time Spent
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                color: theme.palette.text.primary,
              }}
            >
              {Math.round(timeSpent / 60)} minutes
            </Typography>
          </Box>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Audio Player */}
        {recordedAudio && (
          <Paper
            sx={{
              p: 2.5,
              borderRadius: '12px',
              backgroundColor: theme.palette.custom.bgSecondary,
              border: `1px solid ${theme.palette.border.main}`,
            }}
          >
            {/* Hidden Audio Element */}
            <audio
              ref={audioRef}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              style={{ display: 'none' }}
            >
              <source src={audioUrl} type={recordedAudio.mimeType} />
              Your browser does not support the audio element.
            </audio>

            {/* Player Controls */}
            <Stack spacing={2.5}>
              {/* Play Button */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <IconButton
                  onClick={handlePlayPause}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.palette.orange.main}, ${theme.palette.orange.dark})`,
                    color: '#fff',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.orange.dark}, #d97a4f)`,
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isPlaying ? (
                    <PauseOutlined fontSize="large" />
                  ) : (
                    <PlayArrowOutlined fontSize="large" />
                  )}
                </IconButton>
              </Box>

              {/* Time Display */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  {formatTime(currentTime)}
                </Typography>
{/*                 <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                  }}
                >
                  {formatTime(duration)}
                </Typography> */}
              </Box>

              {/* Progress Slider */}
{/*               <Slider
                disabled={!isFinite(duration) || duration === 0}
                min={0}
                max={Math.max(duration, 1)}
                value={isFinite(currentTime) ? currentTime : 0}
                onChange={handleSeek}
                sx={{
                  '& .MuiSlider-thumb': {
                    backgroundColor: theme.palette.orange.main,
                    '&:hover': {
                      boxShadow: `0 0 0 8px ${theme.palette.orange.main}20`,
                    },
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: theme.palette.orange.main,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: theme.palette.border.main,
                  },
                }}
              /> */}

              {/* Volume Control */}
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mt: 1,
                }}
              >
                <VolumeUpOutlined
                  sx={{
                    fontSize: '1.25rem',
                    color: theme.palette.text.secondary,
                  }}
                />
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={handleVolumeChange}
                  sx={{
                    flex: 1,
                    '& .MuiSlider-thumb': {
                      backgroundColor: theme.palette.orange.main,
                      '&:hover': {
                        boxShadow: `0 0 0 8px ${theme.palette.orange.main}20`,
                      },
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: theme.palette.orange.main,
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: theme.palette.border.main,
                    },
                  }}
                />
              </Stack>
            </Stack>
          </Paper>
        )}
      </DialogContent>

      {/* Feedback */}
      {submission?.status === 'submitted' && (
        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.border.main}` }}>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              mb: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Feedback (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add feedback for the child..."
            value={reviewFeedback}
            onChange={(e) => setReviewFeedback(e.target.value)}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'Quicksand, sans-serif',
                borderRadius: '8px',
              },
            }}
          />
        </Box>
      )}

      {/* Actions */}
      <DialogActions
        sx={{
          p: 2.5,
          borderTop: `1px solid ${theme.palette.border.main}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            textTransform: 'none',
            fontSize: '0.9375rem',
            fontWeight: 500,
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          Close
        </Button>

        {submission?.status === 'submitted' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handleReject}
              startIcon={<CancelOutlined />}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                textTransform: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: theme.palette.error.dark,
                },
              }}
            >
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              startIcon={<CheckCircleOutlined />}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                textTransform: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: theme.palette.success.main,
                '&:hover': {
                  backgroundColor: theme.palette.success.dark,
                },
              }}
            >
              Approve
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CheckingAudioPlayRecordingModal;
