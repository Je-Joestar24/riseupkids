import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Box,
} from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { KIDS_WALL_CONSENT_COPY } from '../../../constants/kidsWallConsent';

/**
 * Parent consent dialog before enabling Kids Wall for a child.
 */
const KidsWallConsentModal = ({ open, childName, loading, onConfirm, onCancel }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleClose = () => {
    setAcknowledged(false);
    onCancel();
  };

  const handleConfirm = async () => {
    if (!acknowledged || loading) return;
    await onConfirm();
    setAcknowledged(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          color: themeColors.secondary,
        }}
      >
        {KIDS_WALL_CONSENT_COPY.title}
        {childName ? ` — ${childName}` : ''}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', lineHeight: 1.6 }}>
            {KIDS_WALL_CONSENT_COPY.intro}
          </Typography>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', lineHeight: 1.6 }}>
            {KIDS_WALL_CONSENT_COPY.moderation}
          </Typography>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', lineHeight: 1.6 }}>
            {KIDS_WALL_CONSENT_COPY.visibility}
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={loading}
                inputProps={{ 'aria-label': KIDS_WALL_CONSENT_COPY.checkbox }}
              />
            }
            label={
              <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.95rem' }}>
                {KIDS_WALL_CONSENT_COPY.checkbox}
              </Typography>
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!acknowledged || loading}
          sx={{
            backgroundColor: themeColors.secondary,
            '&:hover': { backgroundColor: '#4db5b5' },
          }}
        >
          {loading ? 'Saving…' : KIDS_WALL_CONSENT_COPY.enableButton}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KidsWallConsentModal;
