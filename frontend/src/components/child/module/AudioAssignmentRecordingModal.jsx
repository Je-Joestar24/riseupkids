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
import { Close as CloseIcon, Mic as MicIcon, Stop as StopIcon, Upload as UploadIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import audioAssignmentProgressService from '../../../services/audioAssignmentProgressService';
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

/**
 * AudioAssignmentRecordingModal (Child-facing)
 *
 * Shows instruction video at top + record button below.
 * Submissions are reviewed by teacher/admin (approved/rejected).
 */
const AudioAssignmentRecordingModal = ({
  open,
  onClose,
  audioAssignment,
  childId,
  courseId,
  onAfterApproved,
}) => {
  const audioAssignmentId =
    audioAssignment?._id || audioAssignment?._contentId || audioAssignment?.contentId || audioAssignment?.id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const instructionVideoUrl = useMemo(() => {
    const media = progress?.audioAssignment?.instructionVideo || audioAssignment?.instructionVideo;
    const url = typeof media === 'string' ? media : media?.url;
    return buildPublicUrl(url);
  }, [progress?.audioAssignment?.instructionVideo, audioAssignment?.instructionVideo]);

  const referenceAudioUrl = useMemo(() => {
    const media = progress?.audioAssignment?.referenceAudio || audioAssignment?.referenceAudio;
    const url = typeof media === 'string' ? media : media?.url;
    return buildPublicUrl(url);
  }, [progress?.audioAssignment?.referenceAudio, audioAssignment?.referenceAudio]);

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
    if (!audioAssignmentId || !childId) return;
    const res = await audioAssignmentProgressService.getProgress(audioAssignmentId, childId);
    setProgress(res?.data || null);
  };

  useEffect(() => {
    if (!open) return;
    if (!audioAssignmentId || !childId) return;

    setError(null);
    setLoading(true);

    // Start + then read latest progress
    Promise.resolve()
      .then(() => audioAssignmentProgressService.start(audioAssignmentId, childId))
      .then(() => fetchProgress())
      .catch((e) => {
        setError(typeof e === 'string' ? e : e?.message || 'Failed to load audio assignment');
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audioAssignmentId, childId]);

  // When approved, mark course content as completed (so cards show completed)
  useEffect(() => {
    const status = progress?.status;
    if (!open) return;
    if (status !== 'approved') return;
    if (!courseId || !childId || !audioAssignmentId) return;

    courseProgressService
      .updateContentProgress(courseId, childId, audioAssignmentId, 'audioAssignment')
      .then(() => {
        if (onAfterApproved) onAfterApproved(progress);
      })
      .catch(() => {
        // non-blocking
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.status, open, courseId, childId, audioAssignmentId]);

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
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
      };

      recorder.start(250); // chunk every 250ms
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      setError(e?.message || 'Failed to start recording');
      cleanupRecording();
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

  const handleStopRecording = () => {
    if (!isRecording) return;
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.stop();
      }
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

  const handleSubmit = async () => {
    if (!recordedBlob || !audioAssignmentId || !childId) return;
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      const ext = recordedBlob.type.includes('ogg') ? 'ogg' : recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `audio-assignment-${audioAssignmentId}-${childId}-${Date.now()}.${ext}`;
      fd.append('recordedAudio', new File([recordedBlob], fileName, { type: recordedBlob.type || 'audio/webm' }));
      fd.append('timeSpent', recordSeconds);
      fd.append(
        'metadata',
        JSON.stringify({
          mimeType: recordedBlob.type || 'audio/webm',
          recordedSeconds: recordSeconds,
        })
      );

      await audioAssignmentProgressService.submit(audioAssignmentId, childId, fd);
      await fetchProgress();
    } catch (e) {
      setError(typeof e === 'string' ? e : e?.message || 'Failed to submit recording');
    } finally {
      setSubmitting(false);
    }
  };

  const status = progress?.status || 'not_started';
  const statusChip = (() => {
    if (status === 'approved') return { label: 'Approved', color: themeColors.success };
    if (status === 'rejected') return { label: 'Needs redo', color: themeColors.error };
    if (status === 'submitted') return { label: 'Submitted', color: themeColors.accent };
    if (status === 'in_progress') return { label: 'In progress', color: themeColors.secondary };
    return { label: 'Not started', color: themeColors.textMuted };
  })();

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        // Persistent modal: do not allow closing via backdrop click or Escape
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        onClose();
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
            {audioAssignment?.title || 'Audio Assignment'}
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
        <IconButton aria-label="Close audio assignment modal" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          padding: 0,
          backgroundColor: themeColors.bgSecondary,
        }}
      >
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

            {/* Instruction Video */}
            {instructionVideoUrl && (
              <Box
                sx={{
                  width: '100%',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backgroundColor: '#000',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  transform: 'translateZ(0)',
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
                    aria-label="Instruction video"
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

            {/* Instructions + reference audio */}
            {audioAssignment?.instructions && (
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
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: themeColors.textSecondary,
                    lineHeight: 1.6,
                  }}
                >
                  {audioAssignment.instructions}
                </Typography>

                {referenceAudioUrl && (
                  <Box sx={{ marginTop: 1.5 }}>
                    <Typography
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 800,
                        color: themeColors.text,
                        marginBottom: 0.75,
                      }}
                    >
                      Example Audio
                    </Typography>
                    <Box
                      component="audio"
                      src={referenceAudioUrl}
                      controls
                      aria-label="Reference audio"
                      sx={{ width: '100%' }}
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* Recording controls */}
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
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                    color: themeColors.text,
                  }}
                >
                  Record your voice
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
                  disabled={isRecording || submitting || status === 'submitted' || status === 'approved'}
                  startIcon={<MicIcon />}
                  role="button"
                  aria-label="Start recording"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '14px',
                    backgroundColor: themeColors.secondary,
                    '&:hover': { backgroundColor: themeColors.primary },
                    transition: 'transform 0.18s ease',
                    '&:active': { transform: 'scale(0.98)' },
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
                  aria-label="Stop recording"
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
                  aria-label="Discard recording"
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
                  disabled={isRecording || submitting || status === 'submitted' || status === 'approved'}
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
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 800,
                      color: themeColors.text,
                      marginBottom: 0.75,
                    }}
                  >
                    Your recording
                  </Typography>
                  <Box component="audio" src={recordedUrl} controls aria-label="Your recorded audio" sx={{ width: '100%' }} />
                </Box>
              )}

              {status === 'rejected' && progress?.adminFeedback && (
                <Alert severity="warning" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Teacher feedback: {progress.adminFeedback}
                </Alert>
              )}

              {status === 'approved' && (
                <Alert severity="success" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Approved! You earned {progress?.starsEarned || 0} stars.
                </Alert>
              )}
              {status === 'submitted' && (
                <Alert severity="info" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Submitted! Waiting for teacher/admin review.
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
          onClick={onClose}
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
          onClick={handleSubmit}
          variant="contained"
          role="button"
          aria-label="Submit recording"
          startIcon={<UploadIcon />}
          disabled={!recordedBlob || isRecording || submitting || status === 'submitted' || status === 'approved'}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 900,
            textTransform: 'none',
            borderRadius: '14px',
            backgroundColor: themeColors.accent,
            color: themeColors.textInverse,
            '&:hover': { backgroundColor: themeColors.orange },
            transition: 'transform 0.18s ease',
            '&:active': { transform: 'scale(0.98)' },
          }}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AudioAssignmentRecordingModal;

