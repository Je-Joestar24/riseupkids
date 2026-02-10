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
} from '@mui/material';
import authService from '../../services/authService';

/** Placeholder terms text until client provides final content */
const DEFAULT_TERMS_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas iaculis vel leo posuere varius. Suspendisse nec suscipit ipsum, nec sollicitudin justo. Phasellus sit amet ante a leo ornare gravida nec in arcu. Nullam efficitur est nulla, ac semper tellus tincidunt id. Quisque ullamcorper lectus vitae neque rutrum, non venenatis risus porttitor. Nulla egestas eu purus sit amet dictum. Proin interdum sem a risus venenatis, id pharetra ex venenatis. Etiam eget condimentum arcu. Aliquam nec ullamcorper neque. Donec elit nulla, tempus at convallis a, imperdiet non augue. Proin tempor eros a sagittis commodo. Fusce vitae dui sit amet diam porta fermentum. Mauris vestibulum eget neque sit amet mollis. Nullam tincidunt orci lectus, eget tempus ante varius at.

Proin vitae suscipit libero. Aliquam erat volutpat. Duis sollicitudin nunc nec ex placerat, a elementum elit lacinia. Ut at lacus id arcu laoreet tincidunt vel a nunc. Quisque lobortis mattis tortor, commodo rutrum odio dignissim in. Aliquam odio felis, luctus non vehicula vel, consectetur non quam. Sed ullamcorper lectus quis venenatis condimentum. Maecenas non purus tempor, rhoncus massa vel, pellentesque lorem. Nullam molestie euismod augue, ac imperdiet est lobortis porta. Nunc in felis sem. Donec non tempus dui, non sollicitudin risus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum turpis nunc, bibendum vitae maximus a, malesuada sit amet tellus. Nullam eu suscipit ex.`;

/**
 * Terms & Conditions modal with scrollable content and required checkbox.
 * User must check "I have read and agree" before accepting.
 *
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Called when modal is closed (Cancel or backdrop)
 * @param {function} onAccept - Called when user clicks "I Agree" (checkbox must be checked)
 * @param {string} [content] - Optional terms text; if not provided, fetches from API or uses default
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
      setContent(data?.content ?? DEFAULT_TERMS_TEXT);
    } catch (err) {
      setError(err?.message || 'Could not load terms.');
      setContent(DEFAULT_TERMS_TEXT);
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

  const displayContent = (contentProp ?? content) || DEFAULT_TERMS_TEXT;

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
                  Showing placeholder. {error}
                </Typography>
              )}
              <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                {displayContent}
              </Typography>
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
                  'aria-label': 'I have read and agree to the Terms & Conditions',
                }}
              />
            }
            label="I have read and agree to the Terms & Conditions"
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
export { DEFAULT_TERMS_TEXT };
