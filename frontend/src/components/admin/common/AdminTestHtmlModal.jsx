import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
  contentId,
  contentTitle = 'HTML5 Test',
  html5PackageId,
  html5EntryPoint,
}) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [launchUrl, setLaunchUrl] = useState(null);

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
      .getLaunchUrl(html5PackageId)
      .then(({ launchUrl: url }) => {
        setLaunchUrl(url);
        setError(null);
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load HTML5 content');
        setLaunchUrl(null);
      })
      .finally(() => setLoading(false));
  }, [html5PackageId]);

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

  return (
    <Dialog
      open={!!open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        elevation: 10,
        sx: {
          borderRadius: '18px',
          fontFamily: 'Quicksand, sans-serif',
          maxHeight: '90vh',
          overflow: 'hidden',
          backgroundColor: themeColors.bgCard,
        },
      }}
      BackdropProps={{
        sx: { backgroundColor: 'rgba(0,0,0,0.65)' },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          px: 0,
          py: 0,
          borderBottom: `3px solid ${themeColors.orange}`,
          backgroundColor: themeColors.bgCard,
          boxShadow: `0 2px 12px ${themeColors.borderOrange}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="span"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                fontSize: '0.95rem',
                color: themeColors.orange,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                mr: 1.5,
              }}
            >
              Test HTML5
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: themeColors.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
                maxWidth: '70%',
                verticalAlign: 'middle',
              }}
              title={contentTitle}
            >
              {contentTitle}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              onClick={handleRetry}
              size="medium"
              aria-label="Reload HTML5 test"
              sx={{
                borderRadius: '12px',
                backgroundColor: themeColors.textInverse,
                border: `2px solid ${themeColors.orange}`,
                color: themeColors.orange,
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
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, backgroundColor: themeColors.bgSecondary }}>
        <Box sx={{ position: 'relative', backgroundColor: '#000', minHeight: 560 }}>
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
            <Box sx={{ p: 3, backgroundColor: themeColors.bgCard, minHeight: 200 }}>
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
              src={launchUrl}
              title="HTML5 Test Player"
              style={{
                width: '100%',
                height: '100%',
                minHeight: 560,
                border: 'none',
                display: loading ? 'none' : 'block',
              }}
              allow="fullscreen"
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: `2px solid ${themeColors.borderOrange}`,
          backgroundColor: themeColors.bgCard,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: themeColors.textSecondary,
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          Testing mode: HTML5 (Captivate) content — no SCORM tracking.
        </Typography>
        <Button
          onClick={handleClose}
          variant="contained"
          sx={{
            borderRadius: '12px',
            backgroundColor: themeColors.orange,
            color: themeColors.textInverse,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 800,
            textTransform: 'none',
            px: 3,
            border: `2px solid ${themeColors.orange}`,
            '&:hover': {
              backgroundColor: themeColors.textInverse,
              color: themeColors.orange,
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
