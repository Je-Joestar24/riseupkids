import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  CircularProgress,
  Link,
} from '@mui/material';
import authService from '../../services/authService';
import { LEGAL_URLS } from '../../config/legalUrls';

const TERMS_LOAD_ERROR =
  'Could not load terms in this window. Please review the full Terms of Use online before continuing.';

/**
 * Terms & Conditions modal with scrollable content and required checkbox.
 */
const TermsConditionServicesModal = ({ open, onClose, onAccept, content: contentProp }) => {
  const [agreed, setAgreed] = useState(false);
  const [content, setContent] = useState(contentProp ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadContent = async () => {
    if (contentProp != null && contentProp !== '') {
      setContent(contentProp);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getTermsContent();
      setContent(data?.content ?? '');
      if (!data?.content) {
        setError(TERMS_LOAD_ERROR);
      }
    } catch (err) {
      setError(err?.message || TERMS_LOAD_ERROR);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setAgreed(false);
      loadContent();
    }
  }, [open, contentProp]);

  const handleAccept = () => {
    if (!agreed) return;
    onAccept?.();
    onClose?.();
  };

  const handleClose = () => {
    setAgreed(false);
    onClose?.();
  };

  const displayContent = (contentProp ?? content) || '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="terms-dialog-title"
      aria-describedby="terms-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle id="terms-dialog-title" component="h2" sx={{ fontWeight: 600 }}>
        Terms & Conditions
      </DialogTitle>
      <DialogContent dividers>
        <Box
          id="terms-dialog-description"
          role="document"
          aria-label="Terms and conditions content"
          sx={{
            maxHeight: 320,
            overflow: 'auto',
            pr: 1,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} aria-hidden />
            </Box>
          ) : (
            <>
              {error && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {error}{' '}
                  <Link href={LEGAL_URLS.terms} target="_blank" rel="noopener noreferrer">
                    Open Terms of Use
                  </Link>
                </Typography>
              )}
              {displayContent ? (
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                  {displayContent}
                </Typography>
              ) : (
                !error && (
                  <Typography variant="body2" color="text.secondary">
                    <Link href={LEGAL_URLS.terms} target="_blank" rel="noopener noreferrer">
                      View Terms of Use
                    </Link>
                    {' · '}
                    <Link href={LEGAL_URLS.privacy} target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </Link>
                  </Typography>
                )
              )}
            </>
          )}
        </Box>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                aria-describedby="terms-dialog-description"
                inputProps={{
                  'aria-label':
                    'I have read and agree to the Terms & Conditions and Privacy Policy',
                }}
              />
            }
            label={
              <>
                I have read and agree to the{' '}
                <Link href={LEGAL_URLS.terms} target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link href={LEGAL_URLS.privacy} target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
              </>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button
          type="button"
          onClick={handleClose}
          color="inherit"
          aria-label="Cancel and close terms"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="contained"
          color="primary"
          disabled={!agreed}
          onClick={handleAccept}
          aria-label="I agree to the terms and conditions"
        >
          I Agree
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsConditionServicesModal;
