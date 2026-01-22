import React, { useEffect, useMemo, useState } from 'react';
import {
  Drawer,
  Box,
  Stack,
  Typography,
  Avatar,
  Chip,
  TextField,
  Button,
  Divider,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { showNotification } from '../../../store/slices/uiSlice';
import { useAuth } from '../../../hooks/userHook';
import themeColors from '../../../config/themeColors';

const drawerWidth = 360;

/**
 * AdminProfileDrawer Component
 * 
 * Profile drawer for admin and teacher users
 * Similar layout to ProfileSidebar but with theme integration
 * Displays user role and allows profile editing
 */
const AdminProfileDrawer = ({ open, onClose, onLogout }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { user, loading, updateUserProfile, changeUserPassword } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Load user data into form when drawer opens or user changes
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setErrors({});
      setShowPassword(false);
    }
  }, [user, open]);

  // Handle form field changes
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Check if form has changes
  const hasFieldChanges = useMemo(() => {
    if (!user) return false;
    const nameChanged = form.name.trim() !== (user.name || '');
    const emailChanged = form.email.trim() !== (user.email || '');
    const passwordChanged =
      form.currentPassword || form.newPassword || form.confirmPassword;
    return nameChanged || emailChanged || !!passwordChanged;
  }, [form, user]);

  // Validate form
  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required';
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    // Validate password change if any field is filled
    if (showPassword || form.newPassword || form.currentPassword || form.confirmPassword) {
      if (!form.currentPassword) {
        nextErrors.currentPassword = 'Current password is required';
      }
      if (!form.newPassword) {
        nextErrors.newPassword = 'New password is required';
      } else if (form.newPassword.length < 8) {
        nextErrors.newPassword = 'New password must be at least 8 characters';
      }
      if (!form.confirmPassword) {
        nextErrors.confirmPassword = 'Confirm new password';
      } else if (form.newPassword !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Handle save profile changes
  const handleSave = async () => {
    if (!validate()) return;

    try {
      // Update profile
      await updateUserProfile({
        name: form.name.trim(),
        email: form.email.trim(),
      });

      // Change password if provided
      if (form.newPassword) {
        await changeUserPassword(form.currentPassword, form.newPassword);
      }

      // Reset password fields
      setShowPassword(false);
      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Handle logout
  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    if (onClose) onClose();
  };

  // Format joined date
  const joinedDate = useMemo(() => {
    if (!user?.createdAt) return null;
    return new Date(user.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [user]);

  // Get role display name
  const getRoleDisplayName = (role) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Get avatar background color based on role
  const getAvatarColor = (role) => {
    return themeColors.orange;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: drawerWidth },
          borderRadius: { sm: '20px 0 0 20px' },
          borderLeft: `1px solid ${themeColors.border}`,
          bgcolor: themeColors.bgSecondary,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1400,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, pt: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: themeColors.text,
            }}
          >
            Profile
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: themeColors.textSecondary }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack spacing={2} sx={{ mt: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: getAvatarColor(user?.role),
                fontSize: '1.75rem',
                fontWeight: 700,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  color: themeColors.text,
                }}
              >
                {user?.name || 'User'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: themeColors.textSecondary,
                  fontSize: '0.875rem',
                }}
              >
                {user?.email || 'user@example.com'}
              </Typography>
            </Box>
          </Stack>

          {/* Role and Meta Info */}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
            <Chip
              label={getRoleDisplayName(user?.role)}
              size="small"
              sx={{
                backgroundColor: getAvatarColor(user?.role),
                color: themeColors.textInverse,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            />
            {joinedDate && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TodayOutlinedIcon
                  sx={{ fontSize: 16, color: themeColors.textSecondary }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: themeColors.textSecondary,
                    fontSize: '0.75rem',
                  }}
                >
                  Joined {joinedDate}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: themeColors.border }} />

      {/* Content */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        <Stack spacing={3}>
          {/* Personal Information Section */}
          <Stack spacing={2}>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                color: themeColors.text,
              }}
            >
              Personal Information
            </Typography>
            <TextField
              label="Full Name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              size="small"
              fullWidth
              error={!!errors.name}
              helperText={errors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon
                      sx={{ fontSize: 18, color: themeColors.textSecondary }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderColor: themeColors.border,
                  fontFamily: 'Quicksand, sans-serif',
                  '&:hover fieldset': {
                    borderColor: themeColors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: themeColors.primary,
                  },
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'Quicksand, sans-serif',
                },
                '& .MuiFormHelperText-root': {
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
            <TextField
              label="Email Address"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              size="small"
              fullWidth
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon
                      sx={{ fontSize: 18, color: themeColors.textSecondary }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderColor: themeColors.border,
                  fontFamily: 'Quicksand, sans-serif',
                  '&:hover fieldset': {
                    borderColor: themeColors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: themeColors.primary,
                  },
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'Quicksand, sans-serif',
                },
                '& .MuiFormHelperText-root': {
                  fontFamily: 'Quicksand, sans-serif',
                },
              }}
            />
          </Stack>

          <Divider sx={{ borderColor: themeColors.border }} />

          {/* Security Section */}
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  color: themeColors.text,
                }}
              >
                Security
              </Typography>
              <Button
                variant="text"
                size="small"
                startIcon={<LockOutlinedIcon sx={{ fontSize: 18 }} />}
                onClick={() => {
                  setShowPassword((prev) => !prev);
                  setForm((prev) => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  }));
                }}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  color: themeColors.primary,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: themeColors.bgTertiary,
                  },
                }}
              >
                {showPassword ? 'Cancel' : 'Change Password'}
              </Button>
            </Stack>

            {showPassword && (
              <Stack spacing={1.5}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => handleChange('currentPassword', e.target.value)}
                  size="small"
                  fullWidth
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderColor: themeColors.border,
                      fontFamily: 'Quicksand, sans-serif',
                      '&:hover fieldset': {
                        borderColor: themeColors.primary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: themeColors.primary,
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontFamily: 'Quicksand, sans-serif',
                    },
                    '& .MuiFormHelperText-root': {
                      fontFamily: 'Quicksand, sans-serif',
                    },
                  }}
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  size="small"
                  fullWidth
                  error={!!errors.newPassword}
                  helperText={errors.newPassword || 'Minimum 8 characters'}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderColor: themeColors.border,
                      fontFamily: 'Quicksand, sans-serif',
                      '&:hover fieldset': {
                        borderColor: themeColors.primary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: themeColors.primary,
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontFamily: 'Quicksand, sans-serif',
                    },
                    '& .MuiFormHelperText-root': {
                      fontFamily: 'Quicksand, sans-serif',
                    },
                  }}
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  size="small"
                  fullWidth
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderColor: themeColors.border,
                      fontFamily: 'Quicksand, sans-serif',
                      '&:hover fieldset': {
                        borderColor: themeColors.primary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: themeColors.primary,
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontFamily: 'Quicksand, sans-serif',
                    },
                    '& .MuiFormHelperText-root': {
                      fontFamily: 'Quicksand, sans-serif',
                    },
                  }}
                />
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: themeColors.border }} />

      {/* Footer */}
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          {loading ? (
            <Button
              variant="contained"
              fullWidth
              disabled
              startIcon={<CircularProgress size={18} />}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Saving...
            </Button>
          ) : (
            hasFieldChanges && (
              <Button
                variant="contained"
                fullWidth
                startIcon={<EditOutlinedIcon />}
                onClick={handleSave}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: themeColors.primary,
                  color: themeColors.textInverse,
                  '&:hover': {
                    backgroundColor: themeColors.secondary,
                  },
                }}
              >
                Save Changes
              </Button>
            )
          )}
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={handleLogoutClick}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              borderColor: themeColors.error,
              color: themeColors.error,
              '&:hover': {
                borderColor: themeColors.error,
                backgroundColor: 'rgba(239, 68, 68, 0.04)',
              },
            }}
          >
            Logout
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default AdminProfileDrawer;
