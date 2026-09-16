import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { VerifiedUser } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import authService from '../../../services/authService';
import TwoFactorSetupFlow from '../../auth/TwoFactorSetupFlow';

/**
 * Optional two-factor authentication settings for parents/teachers (Chunk 10). Shows current
 * status, lets the user enable it (via the shared TwoFactorSetupFlow), disable it (password +
 * code required), or regenerate the recovery-code batch (code required).
 */
const TwoFactorSettings = () => {
  const [status, setStatus] = useState(null); // { enabled, remainingRecoveryCodes }
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [mode, setMode] = useState('view'); // view | enrolling | disabling | regenerating
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState(null);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await authService.getTwoFactorStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const resetForm = () => {
    setMode('view');
    setPassword('');
    setCode('');
    setError('');
    setNewRecoveryCodes(null);
  };

  const handleEnrollComplete = () => {
    resetForm();
    loadStatus();
  };

  const handleDisable = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await authService.disableTwoFactor(password, code);
      resetForm();
      loadStatus();
    } catch (err) {
      setError(err?.message || 'Failed to disable two-factor authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await authService.regenerateRecoveryCodes(code);
      setNewRecoveryCodes(data.recoveryCodes || []);
    } catch (err) {
      setError(err?.message || 'Failed to regenerate recovery codes.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (mode === 'enrolling') {
    return <TwoFactorSetupFlow onComplete={handleEnrollComplete} onCancel={resetForm} />;
  }

  if (mode === 'disabling') {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Enter your password and a current code to disable two-factor authentication.
        </Typography>
        <TextField
          type="password"
          label="Current password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Code"
          placeholder="123456 or a recovery code"
          fullWidth
          value={code}
          onChange={(e) => setCode(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={resetForm} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDisable}
            disabled={!password || !code || submitting}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Disable'}
          </Button>
        </Box>
      </Box>
    );
  }

  if (mode === 'regenerating') {
    if (newRecoveryCodes) {
      return (
        <Box sx={{ py: 2 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            New recovery codes generated. Your old codes no longer work.
          </Alert>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderRadius: 1,
              p: 2,
              mb: 2,
            }}
          >
            {newRecoveryCodes.map((c) => (
              <Typography key={c} variant="body2" sx={{ fontFamily: 'monospace' }}>
                {c}
              </Typography>
            ))}
          </Box>
          <Button variant="contained" onClick={resetForm}>
            Done
          </Button>
        </Box>
      );
    }
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Enter a current code to generate a new set of recovery codes. Your old codes will stop
          working immediately.
        </Typography>
        <TextField
          label="Code"
          placeholder="123456"
          fullWidth
          value={code}
          onChange={(e) => setCode(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={resetForm} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRegenerate} disabled={!code || submitting}>
            {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Generate new codes'}
          </Button>
        </Box>
      </Box>
    );
  }

  // mode === 'view'
  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <VerifiedUser sx={{ color: status?.enabled ? themeColors.primary : 'text.disabled' }} />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Two-factor authentication
        </Typography>
        <Chip
          size="small"
          label={status?.enabled ? 'Enabled' : 'Disabled'}
          color={status?.enabled ? 'success' : 'default'}
        />
      </Box>

      {status?.enabled ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {status.remainingRecoveryCodes} recovery code{status.remainingRecoveryCodes === 1 ? '' : 's'} remaining.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={() => setMode('regenerating')}>
              Regenerate recovery codes
            </Button>
            <Button variant="outlined" color="error" onClick={() => setMode('disabling')}>
              Disable
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add an extra layer of security to your account with an authenticator app.
          </Typography>
          <Button variant="contained" onClick={() => setMode('enrolling')}>
            Enable two-factor authentication
          </Button>
        </>
      )}
    </Box>
  );
};

export default TwoFactorSettings;
