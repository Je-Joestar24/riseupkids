import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from '@mui/material';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import html5Service from '../../../services/html5Service';
import { completeHtml5Book } from './html5CompletionHandler';
import ScormCompletionDialog from './ScormCompletionDialog';
import { ConfirmCloseDialog, TryAgainDialog } from './html5DialogBoxHandler';
import { useDispatch } from 'react-redux';
import { updateChildStats } from '../../../store/slices/userSlice';
import axios from '../../../api/axios';

/**
 * Html5Player (Child-facing)
 *
 * HTML5-only player for Captivate-export packages (books).
 * Uses SCORM-like layout and completion UX (Done button), but no countdown restrictions.
 */
const Html5Player = ({
  open,
  onClose,
  courseId,
  childId,
  bookId,
  contentTitle = 'Book',
  html5PackageId,
  html5EntryPoint = 'index.html',
  onComplete,
}) => {
  const dispatch = useDispatch();
  const iframeRef = useRef(null);
  const scoreRequestIdRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [launchUrl, setLaunchUrl] = useState(null);

  const [isCompleted, setIsCompleted] = useState(false);
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showTryAgainDialog, setShowTryAgainDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  const canLoad = useMemo(() => !!html5PackageId && !!bookId, [html5PackageId, bookId]);

  const updateChildStatsInStorage = useCallback(
    (totalStars) => {
      if (!childId || totalStars === undefined || totalStars === null) return;
      try {
        const childProfilesStr = sessionStorage.getItem('childProfiles');
        if (childProfilesStr) {
          const childProfiles = JSON.parse(childProfilesStr);
          const idx = childProfiles.findIndex((c) => c._id === childId || c._id?.toString() === childId.toString());
          if (idx !== -1) {
            childProfiles[idx].stats = childProfiles[idx].stats || {};
            childProfiles[idx].stats.totalStars = totalStars;
            sessionStorage.setItem('childProfiles', JSON.stringify(childProfiles));
          }
        }

        const selectedChildStr = sessionStorage.getItem('selectedChild');
        if (selectedChildStr) {
          const selectedChild = JSON.parse(selectedChildStr);
          if (selectedChild._id === childId || selectedChild._id?.toString() === childId.toString()) {
            selectedChild.stats = selectedChild.stats || {};
            selectedChild.stats.totalStars = totalStars;
            sessionStorage.setItem('selectedChild', JSON.stringify(selectedChild));
          }
        }

        dispatch(updateChildStats({ childId, stats: { totalStars } }));
        window.dispatchEvent(new Event('childStatsUpdated'));
      } catch (e) {
        // best-effort
      }
    },
    [childId, dispatch]
  );

  const cleanup = useCallback(() => {
    setLaunchUrl(null);
    setLoading(true);
    setError(null);
    setIsCompleted(false);
    setIsCheckingCompletion(false);
    setShowConfirmClose(false);
    setShowTryAgainDialog(false);
    setShowCompletionDialog(false);
    setCompletionData(null);
  }, []);

  const loadHtml5 = useCallback(async () => {
    if (!canLoad) return;
    try {
      setLoading(true);
      setError(null);
      setIsCompleted(false);
      setShowTryAgainDialog(false);
      setShowCompletionDialog(false);
      setCompletionData(null);

      const { launchUrl: url } = await html5Service.getLaunchUrl(html5PackageId, html5EntryPoint);
      if (!url) throw new Error('Failed to get HTML5 launch URL');
      setLaunchUrl(url);
    } catch (e) {
      setError(e?.message || 'Failed to load content');
      setLoading(false);
    }
  }, [canLoad, html5PackageId, html5EntryPoint]);

  useEffect(() => {
    if (open) {
      loadHtml5();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [open, loadHtml5, cleanup]);

  useEffect(() => {
    if (!launchUrl || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const onLoad = () => {
      setLoading(false);
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [launchUrl]);

  const requestHtml5ScoreFromIframe = useCallback(
    () =>
      new Promise((resolve) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) {
          resolve({ score: null, maxScore: null, pass: null });
          return;
        }

        const requestId = ++scoreRequestIdRef.current;
        let done = false;

        const timeoutId = setTimeout(() => {
          if (done) return;
          done = true;
          window.removeEventListener('message', onMessage);
          resolve({ score: null, maxScore: null, pass: null });
        }, 1800);

        function onMessage(event) {
          // Only accept messages from this iframe window
          if (event.source !== iframe.contentWindow) return;
          const data = event.data;
          if (!data || data.type !== 'HTML5_SCORE_RESULT') return;
          if (done) return;
          done = true;
          clearTimeout(timeoutId);
          window.removeEventListener('message', onMessage);
          resolve({
            score: typeof data.score === 'number' ? data.score : null,
            maxScore: typeof data.maxScore === 'number' ? data.maxScore : null,
            pass: typeof data.pass === 'boolean' ? data.pass : null,
            _requestId: requestId,
          });
        }

        window.addEventListener('message', onMessage);
        // Ask the HTML5 package (CloudFront origin) to read Captivate variables and respond.
        iframe.contentWindow.postMessage({ type: 'GET_HTML5_SCORE_V1' }, '*');
      }),
    []
  );

  const handleDoneClick = useCallback(async () => {
    if (isCheckingCompletion || isCompleted) return;
    setIsCheckingCompletion(true);
    setError(null);

    try {
      if (!courseId || !childId || !bookId) {
        setShowTryAgainDialog(true);
        return;
      }

      // Request score/maxScore from the HTML5 package via postMessage bridge (works on CloudFront).
      const scoreResult = await requestHtml5ScoreFromIframe();
      const score = scoreResult?.score ?? null;
      const maxScore = scoreResult?.maxScore ?? null;
      const passed = scoreResult?.pass === true;
      const hasScore = typeof score === 'number' && typeof maxScore === 'number' && maxScore > 0;

      // Always hit backend for debugging: check if the HTML contains the injected bridge script.
      // This is helpful when CloudFront packages were uploaded before the injection fix.
      try {
        await axios.get(`/html5handler/${html5PackageId}/bridge-status`);
      } catch (e) {
        // ignore – debug-only
      }

      // Always do a dry-run submit so backend logs show the payload/parsed score.
      try {
        await completeHtml5Book({
          courseId,
          childId,
          bookId,
          score,
          maxScore,
          status: passed ? 'passed' : 'completed',
          timeSpent: 0,
          progress: 100,
          dryRun: true,
        });
      } catch (e) {
        // ignore – dry-run is for debugging only
      }

      const result = await completeHtml5Book({
        courseId,
        childId,
        bookId,
        score,
        maxScore,
        status: passed ? 'passed' : 'completed',
        timeSpent: 0,
        progress: 100,
      });

      if (result?.success && result?.canComplete) {
        setIsCompleted(true);

        const data = result?.data || {};
        const completionDataToStore = {
          starsAwarded: data.starsAwarded || false,
          starsToAward: data.starsToAward || 0,
          totalStars: data.totalStars || 0,
          readingCount: data.readingCount || 0,
          requiredReadingCount: data.requiredReadingCount || 5,
          requirementMet: data.requirementMet || false,
        };
        setCompletionData(completionDataToStore);

        if (data.totalStars !== undefined && data.totalStars !== null) {
          updateChildStatsInStorage(data.totalStars);
        }

        setShowCompletionDialog(true);

        if (onComplete) {
          onComplete({
            status: data.status || 'completed',
            starsAwarded: data.starsAwarded,
            starsToAward: data.starsToAward,
            totalStars: data.totalStars,
          });
        }
      } else {
        setShowTryAgainDialog(true);
      }
    } catch (e) {
      setShowTryAgainDialog(true);
    } finally {
      setIsCheckingCompletion(false);
    }
  }, [
    isCheckingCompletion,
    isCompleted,
    courseId,
    childId,
    bookId,
    onComplete,
    updateChildStatsInStorage,
    requestHtml5ScoreFromIframe,
  ]);

  const handleTryAgain = useCallback(() => {
    setShowTryAgainDialog(false);
    setError(null);
    setLaunchUrl(null);
    setLoading(true);
    loadHtml5();
  }, [loadHtml5]);

  const handleContinue = useCallback(() => {
    setShowTryAgainDialog(false);
  }, []);

  const handleCloseAttempt = useCallback(() => {
    if (isCompleted) {
      cleanup();
      onClose?.();
      return;
    }
    setShowConfirmClose(true);
  }, [cleanup, isCompleted, onClose]);

  const handleConfirmedClose = useCallback(() => {
    cleanup();
    setShowConfirmClose(false);
    onClose?.();
  }, [cleanup, onClose]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
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
            overflow: 'hidden',
          },
        }}
        BackdropProps={{
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
          onClick: (e) => e.stopPropagation(),
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
            {isCompleted && <CheckCircleIcon sx={{ color: themeColors.success, fontSize: '2.5rem' }} />}
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
            aria-label="Close"
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
            overflow: 'hidden',
          }}
        >
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
                Loading content...
              </Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ padding: 3, backgroundColor: themeColors.bgCard }}>
              <Alert
                severity="error"
                sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '1.3rem', fontWeight: 600 }}
              >
                {error}
              </Alert>
              <Button
                variant="contained"
                onClick={loadHtml5}
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
                  '&:hover': { backgroundColor: themeColors.primary, transform: 'scale(1.05)' },
                }}
              >
                Try Again
              </Button>
            </Box>
          )}

          {launchUrl && !error && (
            <Box sx={{ flex: 1, position: 'relative', backgroundColor: '#000', display: loading ? 'none' : 'block' }}>
              <iframe
                ref={iframeRef}
                src={launchUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '600px',
                  border: 'none',
                  display: 'block',
                  overflow: 'hidden',
                }}
                title="HTML5 Content"
                allow="fullscreen"
                scrolling="no"
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
                '&:hover': { borderWidth: '3px', backgroundColor: themeColors.bgTertiary, transform: 'scale(1.05)' },
              }}
            >
              Close
            </Button>

            <Button
              onClick={handleDoneClick}
              variant="contained"
              disabled={isCompleted || isCheckingCompletion}
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
                '&:hover': { backgroundColor: themeColors.primary, transform: 'scale(1.05)' },
                '&:disabled': { backgroundColor: themeColors.textMuted, color: themeColors.text },
              }}
            >
              {isCheckingCompletion ? 'Checking...' : isCompleted ? 'Completed ✓' : 'Done'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <ConfirmCloseDialog
        open={showConfirmClose}
        onConfirm={handleConfirmedClose}
        onCancel={handleCancelClose}
        title={isCompleted ? 'Book Completed!' : 'Close Book?'}
        isCompleted={isCompleted}
      />

      <TryAgainDialog open={showTryAgainDialog} onTryAgain={handleTryAgain} onContinue={handleContinue} />

      <ScormCompletionDialog
        open={showCompletionDialog}
        onClose={() => {
          setShowCompletionDialog(false);
          setTimeout(() => {
            handleConfirmedClose();
          }, 300);
        }}
        data={completionData}
      />
    </>
  );
};

export default Html5Player;
