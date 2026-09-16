import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import authService from '../../services/authService';

/**
 * Step-up re-authentication prompt (Chunk 10) — a fresh TOTP/recovery code required for the
 * most sensitive admin actions, even in an already logged-in session. Rendered by useStepUp().
 */
const StepUpDialog = ({ open, onVerified, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async () => {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await authService.stepUpVerify(code.trim());
      setCode('');
      onVerified(data.stepUpToken);
    } catch (err) {
      setError(err?.message || 'Invalid verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Verify it's you</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This action needs a fresh code from your authenticator app.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="Code"
          placeholder="123456 or a recovery code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify();
          }}
          disabled={submitting}
        />
        {error && (
          <Typography role="alert" color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleVerify} disabled={!code.trim() || submitting}>
          {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StepUpDialog;
