import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Link,
  Divider,
  InputBase,
  TextField,
  CircularProgress,
} from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import useAuth from '../../hooks/userHook';
import { getPostLoginRedirectPath } from '../../utils/roleRedirect';

const DIGIT_COUNT = 6;
const boxSize = 48;

/**
 * TOTP / recovery-code login completion (Chunk 10). Reached from AuthLoginForm when the
 * password check returns `requiresTwoFactor` — any role, whenever that account has 2FA enabled.
 * Same 6-box UX as the admin email-OTP page, plus a toggle to enter a recovery code instead.
 */
const LoginTwoFactor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyLoginTwoFactor, loading } = useAuth();
  const email = location.state?.email || '';
  const [digits, setDigits] = useState(Array(DIGIT_COUNT).fill(''));
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [localError, setLocalError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true });
    }
  }, [email, navigate]);

  const setDigit = (index, value) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    setLocalError('');
    if (v && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    const next = [...digits];
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);
    setLocalError('');
    const focusIdx = Math.min(pasted.length, DIGIT_COUNT - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const totpCode = digits.join('');
  const code = useRecoveryCode ? recoveryCode.trim() : totpCode;
  const canSubmit = useRecoveryCode ? recoveryCode.trim().length >= 9 : totpCode.length === DIGIT_COUNT;

  const handleVerify = async () => {
    if (!canSubmit || loading || !email) return;
    setLocalError('');
    try {
      const result = await verifyLoginTwoFactor(email, code);
      window.location.assign(getPostLoginRedirectPath(result?.user, result?.twoFactorEnrollmentRequired));
    } catch (error) {
      setLocalError(error?.message || (typeof error === 'string' ? error : 'Invalid verification code'));
      setDigits(Array(DIGIT_COUNT).fill(''));
      setRecoveryCode('');
      inputRefs.current[0]?.focus();
    }
  };

  const toggleRecoveryCode = () => {
    setUseRecoveryCode((prev) => !prev);
    setLocalError('');
    setDigits(Array(DIGIT_COUNT).fill(''));
    setRecoveryCode('');
  };

  if (!email) return null;

  return (
    <Box className="auth-login-page" role="main" aria-label="Enter two-factor verification code">
      <Container maxWidth="sm" className="auth-login-container">
        <AuthLogo />
        <Card className="auth-login-card">
          <CardContent
            className="auth-login-card-content"
            sx={{ margin: '0px', padding: '0px !important', maxWidth: '350px' }}
          >
            <Box className="auth-login-form" sx={{ px: 2, py: 3 }}>
              <Box className="auth-form-header" sx={{ margin: 'auto' }}>
                <Typography variant="h5" className="auth-form-title">
                  Enter code
                </Typography>
              </Box>
              <Typography
                variant="body2"
                className="auth-form-subtitle"
                sx={{ fontWeight: '600', fontSize: '18px', margin: 'auto', marginBottom: '20px' }}
              >
                {useRecoveryCode
                  ? 'Enter one of your recovery codes.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </Typography>

              {useRecoveryCode ? (
                <TextField
                  fullWidth
                  placeholder="ABCDE-12345"
                  value={recoveryCode}
                  onChange={(e) => {
                    setRecoveryCode(e.target.value);
                    setLocalError('');
                  }}
                  disabled={loading}
                  inputProps={{
                    'aria-label': 'Recovery code',
                    autoComplete: 'one-time-code',
                    style: { textAlign: 'center', fontSize: '1.25rem', fontWeight: 700, letterSpacing: 2 },
                  }}
                  sx={{ marginBottom: 2 }}
                />
              ) : (
                <Box
                  sx={{ display: 'flex', gap: 1, justifyContent: 'center', marginBottom: 2 }}
                  onPaste={handlePaste}
                  role="group"
                  aria-label="Six digit verification code"
                >
                  {digits.map((d, i) => (
                    <InputBase
                      key={i}
                      inputRef={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      inputProps={{
                        maxLength: 1,
                        'aria-label': `Digit ${i + 1} of 6`,
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        autoComplete: i === 0 ? 'one-time-code' : 'off',
                      }}
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      disabled={loading}
                      sx={{
                        width: boxSize,
                        height: boxSize,
                        border: '2px solid',
                        borderColor: d ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        '& input': { textAlign: 'center', padding: 0 },
                      }}
                    />
                  ))}
                </Box>
              )}

              {localError ? (
                <Typography
                  role="alert"
                  aria-live="polite"
                  variant="body2"
                  color="error"
                  sx={{ textAlign: 'center', mb: 2, fontWeight: 600 }}
                >
                  {localError}
                </Typography>
              ) : null}

              <Button
                type="button"
                variant="contained"
                fullWidth
                className="auth-signin-button"
                sx={{ borderRadius: '0px', fontSize: '20px' }}
                disabled={!canSubmit || loading}
                onClick={handleVerify}
                aria-label="Verify code and continue"
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                    <span>Verifying...</span>
                  </Box>
                ) : (
                  'Verify and continue'
                )}
              </Button>

              <Box className="auth-links-container" sx={{ margin: 'auto', marginTop: 2 }}>
                <Link
                  component="button"
                  type="button"
                  className="auth-link"
                  sx={{
                    borderRadius: '0px',
                    fontSize: '18px',
                    fontWeight: '600',
                    marginY: '10px',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={toggleRecoveryCode}
                  aria-label={useRecoveryCode ? 'Use my authenticator app instead' : 'Use a recovery code instead'}
                >
                  {useRecoveryCode ? 'Use my authenticator app instead' : 'Use a recovery code instead'}
                </Link>
              </Box>

              <Divider />

              <Box className="auth-create-account-container" sx={{ marginTop: '5px' }}>
                <Link
                  component="button"
                  type="button"
                  className="auth-create-account-link"
                  sx={{
                    borderRadius: '0px',
                    fontSize: '16px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/login')}
                  aria-label="Back to login"
                >
                  Back to login
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginTwoFactor;
