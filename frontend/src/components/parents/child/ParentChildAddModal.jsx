import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, Visibility, VisibilityOff, Lock as LockIcon } from '@mui/icons-material';
import useChildren from '../../../hooks/childrenHook';
import useAuth from '../../../hooks/userHook';
import authService from '../../../services/authService';

/**
 * ParentChildAddModal Component
 * 
 * Modal for adding a new child profile
 * Requires password verification for security
 */
const ParentChildAddModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { createNewChild, loading } = useChildren();
  const { user } = useAuth();

  const [step, setStep] = useState(1); // 1: Password verification, 2: Child form
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    age: '',
  });
  const [errors, setErrors] = useState({});

  // Reset form when modal closes
  const handleClose = () => {
    setStep(1);
    setPassword('');
    setShowPassword(false);
    setPasswordError('');
    setVerifying(false);
    setFormData({
      displayName: '',
      age: '',
    });
    setErrors({});
    onClose();
  };

  // Password verification
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    setVerifying(true);
    setPasswordError('');

    try {
      // Verify password by attempting to login (this doesn't change the session since user is already logged in)
      await authService.login(user.email, password);
      setStep(2);
      setPassword(''); // Clear password for security
    } catch (error) {
      setPasswordError('Incorrect password. Please try again.');
      setPassword(''); // Clear password on error
    } finally {
      setVerifying(false);
    }
  };

  // Form handlers
  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length > 50) {
      newErrors.displayName = 'Display name cannot exceed 50 characters';
    }

    if (formData.age) {
      const ageNum = parseInt(formData.age, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 18) {
        newErrors.age = 'Age must be between 0 and 18';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const childData = {
        displayName: formData.displayName.trim(),
        age: formData.age ? parseInt(formData.age, 10) : undefined,
      };

      await createNewChild(childData);
      handleClose();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: '5px',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: theme.palette.text.primary,
          padding: 3,
          paddingBottom: 2,
          borderBottom: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.custom.bgSecondary,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: theme.palette.text.primary,
          }}
        >
          {step === 1 ? 'Verify Password' : 'Add New Child'}
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{
            minWidth: 'auto',
            padding: 0.5,
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.custom.bgTertiary,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        {step === 1 ? (
          // Password Verification Step
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: 2,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: `${theme.palette.primary.main}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LockIcon sx={{ fontSize: '2rem', color: theme.palette.primary.main }} />
              </Box>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: theme.palette.text.primary,
                  textAlign: 'center',
                }}
              >
                For security, please enter your password to add a new child profile
              </Typography>
            </Box>

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              fullWidth
              required
              error={!!passwordError}
              helperText={passwordError}
              disabled={verifying}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Quicksand, sans-serif',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.background.paper,
                  '& fieldset': {
                    borderColor: theme.palette.border.main,
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
                '& .MuiInputLabel-root': {
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
          </Stack>
        ) : (
          // Child Form Step
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5} sx={{marginTop: '20px'}}>
              <TextField
                label="Child's Name"
                value={formData.displayName}
                onChange={handleChange('displayName')}
                fullWidth
                required
                error={!!errors.displayName}
                helperText={errors.displayName}
                placeholder="Enter child's display name"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    borderRadius: '8px',
                    backgroundColor: theme.palette.background.paper,
                    fontSize: '1.125rem',
                    '& fieldset': {
                      borderColor: theme.palette.border.main,
                    },
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1rem',
                  }
                }}
              />

              <TextField
                label="Age (Optional)"
                type="number"
                value={formData.age}
                onChange={handleChange('age')}
                fullWidth
                error={!!errors.age}
                helperText={errors.age || 'Age between 0 and 18'}
                inputProps={{
                  min: 0,
                  max: 18,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    borderRadius: '8px',
                    backgroundColor: theme.palette.background.paper,
                    fontSize: '1.125rem',
                    '& fieldset': {
                      borderColor: theme.palette.border.main,
                    },
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1rem',
                  },
                }}
              />
            </Stack>
          </form>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          paddingTop: 2,
          borderTop: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.custom.bgSecondary,
          gap: 1,
        }}
      >
        {step === 1 ? (
          <>
            <Button
              onClick={handleClose}
              variant="outlined"
              disabled={verifying}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '8px 24px',
                borderRadius: '8px',
                textTransform: 'none',
                borderColor: theme.palette.border.main,
                color: theme.palette.text.primary,
                '&:hover': {
                  borderColor: theme.palette.text.secondary,
                  backgroundColor: theme.palette.custom.bgTertiary,
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyPassword}
              variant="contained"
              disabled={verifying || !password.trim()}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '8px 24px',
                borderRadius: '8px',
                textTransform: 'none',
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.textCustom.inverse,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setStep(1)}
              variant="outlined"
              disabled={loading}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '8px 24px',
                borderRadius: '8px',
                textTransform: 'none',
                borderColor: theme.palette.border.main,
                color: theme.palette.text.primary,
                '&:hover': {
                  borderColor: theme.palette.text.secondary,
                  backgroundColor: theme.palette.custom.bgTertiary,
                },
              }}
            >
              Back
            </Button>
            <Button
              onClick={handleClose}
              variant="outlined"
              disabled={loading}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '8px 24px',
                borderRadius: '8px',
                textTransform: 'none',
                borderColor: theme.palette.border.main,
                color: theme.palette.text.primary,
                '&:hover': {
                  borderColor: theme.palette.text.secondary,
                  backgroundColor: theme.palette.custom.bgTertiary,
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '8px 24px',
                borderRadius: '8px',
                textTransform: 'none',
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.textCustom.inverse,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              {loading ? 'Creating...' : 'Add Child'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ParentChildAddModal;

