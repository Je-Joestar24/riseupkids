import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Alert } from '@mui/material';
import authService from '../../services/authService';

/**
 * TOTP enrollment flow (Chunk 10): start -> show QR + manual key -> confirm a live code ->
 * show the one-time recovery-code batch. Shared between the mandatory admin setup page and the
 * optional parent/teacher settings panel — the only difference is what happens on completion
 * (`onComplete`) and whether cancelling is offered (`onCancel`).
 *
 * @param {{ onComplete: (recoveryCodes: string[]) => void, onCancel?: () => void }} props
 */
const TwoFactorSetupFlow = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState('loading'); // loading | scan | recovery-codes | error
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authService.setupTwoFactor();
        if (cancelled) return;
        setQrDataUrl(data.qrDataUrl);
        setSecret(data.secret);
        setStep('scan');
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Failed to start two-factor setup.');
        setStep('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async () => {
    if (code.replace(/\D/g, '').length !== 6 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await authService.verifySetupTwoFactor(code.replace(/\D/g, ''));
      setRecoveryCodes(data.recoveryCodes || []);
      setStep('recovery-codes');
    } catch (err) {
      setError(err?.message || 'Invalid verification code.');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const text = [
      'Rise Up Kids — two-factor recovery codes',
      'Each code works once. Store them somewhere safe.',
      '',
      ...recoveryCodes,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riseupkids-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (step === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (step === 'error') {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
        {onCancel && (
          <Button sx={{ mt: 2 }} onClick={onCancel}>
            Back
          </Button>
        )}
      </Box>
    );
  }

  if (step === 'scan') {
    return (
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
          Scan this QR code with your authenticator app
        </Typography>
        {qrDataUrl && (
          <Box
            component="img"
            src={qrDataUrl}
            alt="Two-factor authentication QR code"
            sx={{ width: 200, height: 200, mx: 'auto', display: 'block', mb: 2 }}
          />
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Can't scan? Enter this key manually:
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1, mb: 3, wordBreak: 'break-all' }}
        >
          {secret}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          Enter the 6-digit code from the app to confirm
        </Typography>
        <TextField
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setError('');
          }}
          placeholder="123456"
          inputProps={{
            inputMode: 'numeric',
            style: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, letterSpacing: 4 },
            'aria-label': 'Six digit confirmation code',
          }}
          sx={{ maxWidth: 220, mb: 2 }}
        />

        {error && (
          <Typography role="alert" color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          {onCancel && (
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={code.length !== 6 || submitting}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Confirm and enable'}
          </Button>
        </Box>
      </Box>
    );
  }

  // step === 'recovery-codes'
  return (
    <Box sx={{ py: 2 }}>
      <Alert severity="success" sx={{ mb: 2 }}>
        Two-factor authentication is now enabled.
      </Alert>
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
        Save these recovery codes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each code works once, and gets you back in if you lose access to your authenticator app.
        They won't be shown again after you leave this screen.
      </Typography>
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
        {recoveryCodes.map((c) => (
          <Typography key={c} variant="body2" sx={{ fontFamily: 'monospace' }}>
            {c}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={handleDownloadRecoveryCodes}>
          Download codes
        </Button>
        <Button variant="contained" onClick={() => onComplete?.(recoveryCodes)}>
          Done
        </Button>
      </Box>
    </Box>
  );
};

export default TwoFactorSetupFlow;
