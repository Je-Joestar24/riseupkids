import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import authService from '../../../services/authService';

const CONFIRM_TEXT = 'DELETE';

/**
 * Confirmation modal for self-service parent account deletion.
 */
const DeleteAccountModal = ({ open, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (loading) return;
    setPassword('');
    setConfirmText('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    if (confirmText.trim().toUpperCase() !== CONFIRM_TEXT) {
      setError(`Please type ${CONFIRM_TEXT} to confirm.`);
      return;
    }

    setLoading(true);
    try {
      const response = await authService.deleteAccount({ password, confirmText });
      if (onSuccess) {
        await onSuccess(response);
      }
      handleClose();
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : err?.message || 'Failed to delete account. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="delete-account-dialog-title"
      PaperProps={{
        sx: {
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: themeColors.bgCard,
        },
      }}
    >
      <DialogTitle
        id="delete-account-dialog-title"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          color: themeColors.error,
        }}
      >
        Delete my account
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '15px',
            color: themeColors.textSecondary,
            lineHeight: 1.6,
            mb: 2,
          }}
        >
          This will revoke your login immediately and request permanent deletion of your account,
          all child profiles, recordings, and related data. Billing records required by law may be
          retained separately. Active Stripe subscriptions will be scheduled to cancel when
          applicable.
        </Typography>

        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            color: themeColors.text,
            mb: 2,
          }}
        >
          Data is typically removed within 30 days. You will receive email confirmation when
          deletion is complete.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoComplete="current-password"
            disabled={loading}
          />
          <TextField
            label={`Type ${CONFIRM_TEXT} to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            fullWidth
            disabled={loading}
            inputProps={{ 'aria-label': `Type ${CONFIRM_TEXT} to confirm account deletion` }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          color="error"
          variant="contained"
          sx={{ textTransform: 'none', minWidth: 140 }}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {loading ? 'Deleting…' : 'Delete my account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteAccountModal;
