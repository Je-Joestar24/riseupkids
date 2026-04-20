import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import html5Service from '../../../services/html5Service';

/**
 * AdminTestHtmlModal
 *
 * Admin/Teacher testing modal for HTML5 (e.g. Captivate) book content.
 * Loads the HTML5 package in an iframe via the launch URL.
 */
export default function AdminTestHtmlModal({
  open,
  onClose,
  contentId: _contentId,
  contentTitle: _contentTitle = 'HTML5 Test',
  html5PackageId,
  html5EntryPoint,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [launchUrl, setLaunchUrl] = useState(null);
  const iframeRef = React.useRef(null);

  const resetState = () => {
    setLoading(true);
    setError(null);
    setLaunchUrl(null);
  };

  const fetchLaunchUrl = React.useCallback(() => {
    if (!html5PackageId) {
      setError('No HTML5 package ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    html5Service
      .getLaunchUrl(html5PackageId, html5EntryPoint)
      .then(({ launchUrl: url }) => {
        setLaunchUrl(url);
        setError(null);
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load HTML5 content');
        setLaunchUrl(null);
      })
      .finally(() => setLoading(false));
  }, [html5PackageId, html5EntryPoint]);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    if (open && html5PackageId) {
      fetchLaunchUrl();
    } else if (open && !html5PackageId) {
      setError('No HTML5 package ID');
      setLoading(false);
    }
  }, [open, html5PackageId, fetchLaunchUrl]);

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const handleRetry = () => {
    fetchLaunchUrl();
  };

  const enforceFullSizeInIframe = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      const styleId = 'riseupkids-html5-stretch-style';
      if (!doc.getElementById(styleId)) {
        const styleEl = doc.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #000 !important;
          }

          #project_container,
          #project,
          #project_main,
          #div_Slide,
          #autoplayDiv,
          #pwdv,
          #exdv {
            position: absolute !important;
            inset: 0 !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            margin: 0 !important;
          }

          #project_container,
          #project,
          #project_main {
            overflow: hidden !important;
          }

          .cp-main,
          .cp-movie,
          .cp-frameset {
            width: 100% !important;
            height: 100% !important;
          }
        `;
        doc.head?.appendChild(styleEl);
      }
    } catch (_e) {
      // Ignore cross-origin access restrictions.
    }
  }, []);

  const handleIframeLoad = React.useCallback(() => {
    setLoading(false);
    enforceFullSizeInIframe();
    // Captivate may rewrite inline sizes after initial load; re-apply once more.
    window.setTimeout(enforceFullSizeInIframe, 500);
    window.setTimeout(enforceFullSizeInIframe, 1500);
  }, [enforceFullSizeInIframe]);

  return (
    <Dialog
      open={!!open}
      onClose={handleClose}
      fullScreen
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 0,
          fontFamily: 'Quicksand, sans-serif',
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          overflow: 'hidden',
          backgroundColor: '#000',
        },
      }}
      BackdropProps={{
        sx: { backgroundColor: '#000' },
      }}
    >
      <DialogContent sx={{ p: 0, backgroundColor: '#000' }}>
        <Box sx={{ position: 'relative', backgroundColor: '#000', width: '100vw', height: '100vh' }}>
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <IconButton
              onClick={handleRetry}
              size="medium"
              aria-label="Reload HTML5 test"
              sx={{
                borderRadius: '12px',
                backgroundColor: 'rgba(0,0,0,0.45)',
                border: `2px solid ${themeColors.orange}`,
                color: themeColors.textInverse,
                backdropFilter: 'blur(6px)',
                '&:hover': {
                  backgroundColor: themeColors.orange,
                  color: themeColors.textInverse,
                },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleClose}
              aria-label="Close HTML5 test"
              sx={{
                borderRadius: '12px',
                backgroundColor: themeColors.orange,
                color: themeColors.textInverse,
                border: `2px solid ${themeColors.orange}`,
                '&:hover': {
                  backgroundColor: themeColors.textInverse,
                  color: themeColors.orange,
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {loading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: themeColors.bgCard,
                zIndex: 3,
                gap: 2,
              }}
            >
              <CircularProgress sx={{ color: themeColors.orange }} />
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: themeColors.textSecondary,
                }}
              >
                Loading HTML5…
              </Typography>
            </Box>
          )}

          {error && !launchUrl && (
            <Box
              sx={{
                p: 3,
                backgroundColor: 'rgba(0,0,0,0.7)',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  color: themeColors.error,
                  mb: 2,
                }}
              >
                {error}
              </Typography>
              <Button
                onClick={handleRetry}
                variant="contained"
                sx={{
                  backgroundColor: themeColors.orange,
                  color: themeColors.textInverse,
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: '12px',
                  px: 3,
                  border: `2px solid ${themeColors.orange}`,
                  '&:hover': {
                    backgroundColor: themeColors.text,
                    borderColor: themeColors.text,
                  },
                }}
              >
                Retry
              </Button>
            </Box>
          )}

          {launchUrl && !error && (
            <iframe
              ref={iframeRef}
              src={launchUrl}
              title="HTML5 Test Player"
              onLoad={handleIframeLoad}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
              allow="fullscreen"
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
