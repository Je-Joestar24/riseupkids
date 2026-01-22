import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Chip,
} from '@mui/material';
import { Close as CloseIcon, Mic as MicIcon, Stop as StopIcon, CheckCircle as CheckIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { updateChildStats } from '../../../store/slices/userSlice';
import { themeColors } from '../../../config/themeColors';
import chantProgressService from '../../../services/chantProgressService';
import courseProgressService from '../../../services/courseProgressService';

const buildPublicUrl = (maybeUrl) => {
  if (!maybeUrl) return null;
  // Handle both string URLs and Media objects with .url property
  const urlStr = typeof maybeUrl === 'string' ? maybeUrl : maybeUrl?.url || '';
  if (!urlStr) return null;
  
  // If already absolute, return as-is
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr;
  
  // Otherwise, prepend base URL
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${baseUrl}${urlStr.startsWith('/') ? urlStr : `/${urlStr}`}`;
};

const pickBestAudioMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
};

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
        Do you want to close this activity? Your recording will be lost!
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
        Keep Recording
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
 * ChantRecordingModal (Child-facing)
 *
 * Similar to audio assignment modal, but completion is immediate (no review).
 */
const ChantRecordingModal = ({ open, onClose, chant, childId, courseId, onAfterComplete }) => {
  const dispatch = useDispatch();
  const chantId = chant?._id || chant?._contentId || chant?.contentId || chant?.id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const fileInputRef = useRef(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const instructionVideoUrl = useMemo(() => {
    const media = progress?.chant?.instructionVideo || chant?.instructionVideo;
    const url = typeof media === 'string' ? media : media?.url;
    // Only use buildPublicUrl if it's a valid path or URL, not just an ID
    if (!url || /^[a-f0-9]{24}$/i.test(url)) return null;
    return buildPublicUrl(url);
  }, [progress?.chant?.instructionVideo, chant?.instructionVideo]);

  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      } catch (e) {
        // ignore
      }
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const cleanupRecordedMedia = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedUrl(null);
    setRecordedBlob(null);
    setRecordSeconds(0);
    chunksRef.current = [];
  };

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

  // Cleanup on close/unmount
  useEffect(() => {
    if (!open) {
      cleanupRecording();
      cleanupRecordedMedia();
      setProgress(null);
      setError(null);
    }
    return () => {
      cleanupRecording();
      cleanupRecordedMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Add beforeunload warning when modal is open with unsaved recording
  useEffect(() => {
    const status = progress?.status || 'not_started';
    const handleBeforeUnload = (e) => {
      // Only warn if there's a recording and the activity hasn't been submitted/completed
      if (open && (recordedBlob || isRecording) && status !== 'completed') {
        e.preventDefault();
        e.returnValue = 'Your recording will be lost if you leave this page.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [open, recordedBlob, isRecording, progress?.status]);

  const handleStartRecording = async () => {
    setError(null);
    if (isRecording) return;
    try {
      cleanupRecordedMedia();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const mimeType = pickBestAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError(e?.message || 'Failed to start recording');
      cleanupRecording();
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
    } catch (e) {
      // ignore
    } finally {
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('audio/')) {
      setError('Please select an audio file');
      return;
    }
    cleanupRecordedMedia();
    const url = URL.createObjectURL(file);
    setRecordedBlob(file);
    setRecordedUrl(url);
    setRecordSeconds(0);
    setError(null);
  };

  // Handle close attempt - show confirmation if there's unsaved work
  const handleCloseAttempt = () => {
    const currentStatus = progress?.status || 'not_started';
    if ((recordedBlob || isRecording) && currentStatus !== 'completed') {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  // Handle confirmed close
  const handleConfirmedClose = () => {
    setShowConfirmClose(false);
    cleanupRecordedMedia();
    cleanupRecording();
    onClose();
  };

  // Handle cancel close
  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  const handleComplete = async () => {
    if (!recordedBlob || !chantId || !childId) return;
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      const ext = recordedBlob.type.includes('ogg') ? 'ogg' : recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `chant-${chantId}-${childId}-${Date.now()}.${ext}`;
      fd.append('recordedAudio', new File([recordedBlob], fileName, { type: recordedBlob.type || 'audio/webm' }));
      fd.append('timeSpent', recordSeconds);
      fd.append(
        'metadata',
        JSON.stringify({
          mimeType: recordedBlob.type || 'audio/webm',
          recordedSeconds: recordSeconds,
        })
      );

      const completeResult = await chantProgressService.complete(chantId, childId, fd);
      await fetchProgress();

      // Mark course content as completed
      if (courseId) {
        await courseProgressService.updateContentProgress(courseId, childId, chantId, 'chant');
      }

      // Update Redux state with new stars - this is the source of truth
      if (completeResult?.data?.starsEarned) {
        const starsEarned = completeResult.data.starsEarned;
        console.log('[ChantRecordingModal] Chant completed, stars earned:', starsEarned);
        
        // Dispatch Redux action to update child stats
        dispatch(updateChildStats({
          childId,
          stats: { totalStars: (progress?.starsEarned || 0) + starsEarned },
        }));
        
        // Also update sessionStorage for persistence across refreshes
        try {
          const childProfiles = JSON.parse(sessionStorage.getItem('childProfiles') || '[]');
          const selectedChild = JSON.parse(sessionStorage.getItem('selectedChild') || '{}');
          
          const currentTotalStars = (selectedChild.stats?.totalStars || 0) + starsEarned;
          
          // Update selectedChild in sessionStorage
          const updatedChild = {
            ...selectedChild,
            stats: {
              ...selectedChild.stats,
              totalStars: currentTotalStars,
            },
          };
          sessionStorage.setItem('selectedChild', JSON.stringify(updatedChild));
          
          // Update childProfiles in sessionStorage
          const updatedProfiles = childProfiles.map(c => 
            c._id === childId 
              ? { ...c, stats: { ...c.stats, totalStars: currentTotalStars } }
              : c
          );
          sessionStorage.setItem('childProfiles', JSON.stringify(updatedProfiles));
          
          console.log('[ChantRecordingModal] Updated sessionStorage with new totalStars');
        } catch (storageError) {
          console.error('[ChantRecordingModal] Error updating sessionStorage:', storageError);
        }
        
        // Trigger event for components listening to updates
        window.dispatchEvent(new Event('childStatsUpdated'));
        console.log('[ChantRecordingModal] Dispatched childStatsUpdated event');
      }

      if (onAfterComplete) onAfterComplete();
    } catch (e) {
      setError(typeof e === 'string' ? e : e?.message || 'Failed to complete chant');
    } finally {
      setSubmitting(false);
    }
  };

  const status = progress?.status || 'not_started';
  const statusChip = (() => {
    if (status === 'completed') return { label: 'Completed', color: themeColors.success };
    if (status === 'in_progress') return { label: 'In progress', color: themeColors.secondary };
    return { label: 'Not started', color: themeColors.textMuted };
  })();

  return (
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '18px',
          overflow: 'hidden',
          backgroundColor: themeColors.bgCard,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 2.5,
          backgroundColor: themeColors.bgCard,
          borderBottom: `3px solid ${themeColors.secondary}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 800,
              fontSize: '1.35rem',
              color: themeColors.primary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '70vw',
            }}
          >
            {chant?.title || 'Chant'}
          </Typography>
          <Chip
            label={statusChip.label}
            size="small"
            sx={{
              backgroundColor: statusChip.color,
              color: themeColors.textInverse,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
            }}
          />
        </Box>
        <IconButton aria-label="Close chant modal" onClick={handleCloseAttempt}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 0, backgroundColor: themeColors.bgSecondary }}>
        {loading ? (
          <Box sx={{ padding: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ padding: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                {error}
              </Alert>
            )}

            {instructionVideoUrl && (
              <Box
                sx={{
                  width: '100%',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backgroundColor: '#000',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                }}
              >
                {/* Rectangular (16:9) video container */}
                <Box
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    backgroundColor: '#000',
                  }}
                >
                  <Box
                    component="video"
                    src={instructionVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    autoPlay
                    muted
                    aria-label="Chant instruction video"
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      backgroundColor: '#000',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              </Box>
            )}

            {(chant?.instructions || '').trim() && (
              <Box
                sx={{
                  backgroundColor: themeColors.textInverse,
                  borderRadius: '14px',
                  padding: 2,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                    color: themeColors.text,
                    marginBottom: 0.75,
                  }}
                >
                  Instructions
                </Typography>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: themeColors.textSecondary, lineHeight: 1.6 }}>
                  {chant.instructions}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                backgroundColor: themeColors.textInverse,
                borderRadius: '14px',
                padding: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800, color: themeColors.text }}>
                  Record your chant
                </Typography>
                <Chip
                  label={`${recordSeconds}s`}
                  size="small"
                  sx={{
                    backgroundColor: isRecording ? themeColors.error : themeColors.bgTertiary,
                    color: isRecording ? themeColors.textInverse : themeColors.text,
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  onClick={handleStartRecording}
                  variant="contained"
                  disabled={isRecording || submitting || status === 'completed'}
                  startIcon={<MicIcon />}
                  role="button"
                  aria-label="Start recording chant"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '14px',
                    backgroundColor: themeColors.secondary,
                    '&:hover': { backgroundColor: themeColors.primary },
                  }}
                >
                  Record
                </Button>
                <Button
                  onClick={handleStopRecording}
                  variant="outlined"
                  disabled={!isRecording}
                  startIcon={<StopIcon />}
                  role="button"
                  aria-label="Stop recording chant"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '14px',
                    borderWidth: '2px',
                  }}
                >
                  Stop
                </Button>
                <Button
                  onClick={() => {
                    cleanupRecording();
                    cleanupRecordedMedia();
                  }}
                  variant="text"
                  disabled={isRecording || submitting || (!recordedBlob && !recordedUrl)}
                  role="button"
                  aria-label="Discard chant recording"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '14px',
                    color: themeColors.orange,
                  }}
                >
                  Re-record
                </Button>

                <Button
                  onClick={handleUploadClick}
                  variant="outlined"
                  disabled={isRecording || submitting || status === 'completed'}
                  startIcon={<CloudUploadIcon />}
                  role="button"
                  aria-label="Upload audio file"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '14px',
                    borderWidth: '2px',
                  }}
                >
                  Upload audio
                </Button>
                <input
                  type="file"
                  accept="audio/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelected}
                  aria-label="Select audio file"
                />
              </Box>

              {recordedUrl && (
                <Box>
                  <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 800, color: themeColors.text, marginBottom: 0.75 }}>
                    Your recording
                  </Typography>
                  <Box component="audio" src={recordedUrl} controls aria-label="Your chant recording" sx={{ width: '100%' }} />
                </Box>
              )}

              {status === 'completed' && (
                <Alert icon={<CheckIcon />} severity="success" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Completed! You earned {progress?.starsEarned || 0} stars.
                </Alert>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          padding: 2,
          backgroundColor: themeColors.bgCard,
          borderTop: `2px solid ${themeColors.bgTertiary}`,
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={handleCloseAttempt}
          variant="outlined"
          role="button"
          aria-label="Close"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: '14px',
            borderWidth: '2px',
          }}
        >
          Close
        </Button>
        <Button
          onClick={handleComplete}
          variant="contained"
          role="button"
          aria-label="Complete chant"
          startIcon={<CheckIcon />}
          disabled={!recordedBlob || isRecording || submitting || status === 'completed'}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 900,
            textTransform: 'none',
            borderRadius: '14px',
            backgroundColor: themeColors.success,
            color: themeColors.textInverse,
            '&:hover': { backgroundColor: themeColors.secondary },
          }}
        >
          {submitting ? 'Saving…' : 'Complete'}
        </Button>
      </DialogActions>

      <ConfirmCloseDialog
        open={showConfirmClose}
        onConfirm={handleConfirmedClose}
        onCancel={handleCancelClose}
        title="Save your recording?"
      />
    </Dialog>
  );
};

export default ChantRecordingModal;

