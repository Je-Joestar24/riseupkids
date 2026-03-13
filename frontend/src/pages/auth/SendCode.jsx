import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Link,
  Divider,
  InputBase,
} from '@mui/material';
import AuthLogo from '../../components/auth/AuthLogo';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

const DIGIT_COUNT = 6;
const boxSize = 48;

/**
 * SendCode page: 6 single-digit inputs with auto-focus next.
 * Email comes from location.state (set by ForgetPassword). On "Verify" navigates to reset-password with email and code in URL.
 */
const SendCode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [digits, setDigits] = useState(Array(DIGIT_COUNT).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forget/password', { replace: true });
    }
  }, [email, navigate]);

  const setDigit = (index, value) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
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
    pasted.split('').forEach((char, i) => { next[i] = char; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, DIGIT_COUNT - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const code = digits.join('');
  const canSubmit = code.length === DIGIT_COUNT;

  const handleVerify = () => {
    if (!canSubmit || !email) return;
    const params = new URLSearchParams({ email, code });
    navigate(`/reset-password?${params.toString()}`, { replace: true });
  };

  if (!email) return null;

  return (
    <Box className="auth-login-page" role="main" aria-label="Enter reset code">
      <Container maxWidth="sm" className="auth-login-container">
        <AuthLogo />
        <Card className="auth-login-card">
          <CardContent className="auth-login-card-content" sx={{ margin: '0px', padding: '0px !important', maxWidth: '350px' }}>
            <Box className="auth-login-form" sx={{ px: 2, py: 3 }}>
              <Box className="auth-form-header" sx={{ margin: 'auto' }}>
                <Typography variant="h5" className="auth-form-title">
                  Enter code
                </Typography>
              </Box>
              <Typography variant="body2" className="auth-form-subtitle" sx={{ fontWeight: '600', fontSize: '18px', margin: 'auto', marginBottom: '20px' }}>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  justifyContent: 'center',
                  marginBottom: 3,
                }}
                onPaste={handlePaste}
              >
                {digits.map((d, i) => (
                  <InputBase
                    key={i}
                    inputRef={(el) => (inputRefs.current[i] = el)}
                    inputProps={{
                      maxLength: 1,
                      'aria-label': `Digit ${i + 1} of 6`,
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      autoComplete: 'one-time-code',
                    }}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    sx={{
                      width: boxSize,
                      height: boxSize,
                      border: '2px solid',
                      borderColor: d ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      '& input': {
                        textAlign: 'center',
                        padding: 0,
                      },
                    }}
                  />
                ))}
              </Box>

              <Button
                type="button"
                variant="contained"
                fullWidth
                className="auth-signin-button"
                sx={{ borderRadius: '0px', fontSize: '20px' }}
                disabled={!canSubmit}
                onClick={handleVerify}
              >
                Verify and continue
              </Button>

              <Box className="auth-links-container" sx={{ margin: 'auto', marginTop: 2 }}>
                <Link
                  component="button"
                  type="button"
                  className="auth-link"
                  sx={{ borderRadius: '0px', fontSize: '18px', fontWeight: '600', marginY: '10px', textDecoration: 'none', cursor: 'pointer' }}
                  onClick={() => navigate('/forget/password')}
                >
                  Use a different email
                </Link>
              </Box>

              <Divider />

              <Box className="auth-create-account-container" sx={{ marginTop: '5px' }}>
                <Link
                  component="button"
                  type="button"
                  className="auth-create-account-link"
                  sx={{ borderRadius: '0px', fontSize: '16px', fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }}
                  onClick={() => navigate('/login')}
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

export default SendCode;
