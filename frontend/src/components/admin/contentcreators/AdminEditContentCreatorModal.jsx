import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';
import useContentCreators from '../../../hooks/contentCreatorsHook';

/**
 * AdminEditContentCreatorModal Component
 *
 * Edit modal for updating ContentCreator information (admin only)
 */
const AdminEditContentCreatorModal = ({ open, onClose, ContentCreatorId }) => {
  const theme = useTheme();
  const { fetchContentCreator, currentContentCreator, updateContentCreatorData, loading } = useContentCreators();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && ContentCreatorId) {
      fetchContentCreator(ContentCreatorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ContentCreatorId]);

  useEffect(() => {
    if (currentContentCreator) {
      setFormData((prev) => ({
        ...prev,
        name: currentContentCreator.name || '',
        email: currentContentCreator.email || '',
        isActive: currentContentCreator.isActive !== undefined ? currentContentCreator.isActive : true,
      }));
    }
  }, [currentContentCreator]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'isActive' ? value === 'true' : value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    const hasPassword = !!formData.password.trim();
    const hasConfirm = !!formData.confirmPassword.trim();
    if (hasPassword || hasConfirm) {
      if (!formData.password.trim()) newErrors.password = 'New password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm the password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const { password, confirmPassword, ...rest } = formData;
    const updatePayload = { ...rest };
    if (password && password.trim()) {
      updatePayload.password = password.trim();
    }

    try {
      await updateContentCreatorData(ContentCreatorId, updatePayload);
      onClose();
    } catch (error) {
      // handled by hook notifications
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', isActive: true, password: '', confirmPassword: '' });
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-label="Edit ContentCreator dialog"
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 0,
        },
      }}
    >
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
          Edit ContentCreator
        </Typography>
        <Button
          onClick={handleClose}
          aria-label="Close edit ContentCreator dialog"
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
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ padding: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={handleChange('name')}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Quicksand, sans-serif',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.background.paper,
                  '& fieldset': { borderColor: theme.palette.border.main },
                  '&:hover fieldset': { borderColor: theme.palette.primary.main },
                  '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                },
                '& .MuiInputLabel-root': { fontFamily: 'Quicksand, sans-serif' },
              }}
            />

            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
              required
              error={!!errors.email}
              helperText={errors.email}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Quicksand, sans-serif',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.background.paper,
                  '& fieldset': { borderColor: theme.palette.border.main },
                  '&:hover fieldset': { borderColor: theme.palette.primary.main },
                  '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                },
                '& .MuiInputLabel-root': { fontFamily: 'Quicksand, sans-serif' },
              }}
            />

            <TextField
              label="New password (optional)"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              fullWidth
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password || 'Leave blank to keep current password'}
              placeholder="Min 6 characters"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Quicksand, sans-serif',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.background.paper,
                  '& fieldset': { borderColor: theme.palette.border.main },
                  '&:hover fieldset': { borderColor: theme.palette.primary.main },
                  '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                },
                '& .MuiInputLabel-root': { fontFamily: 'Quicksand, sans-serif' },
              }}
            />

            <TextField
              label="Confirm new password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              fullWidth
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Quicksand, sans-serif',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.background.paper,
                  '& fieldset': { borderColor: theme.palette.border.main },
                  '&:hover fieldset': { borderColor: theme.palette.primary.main },
                  '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                },
                '& .MuiInputLabel-root': { fontFamily: 'Quicksand, sans-serif' },
              }}
            />

            <FormControl fullWidth>
              <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Status</InputLabel>
              <Select
                value={String(formData.isActive)}
                label="Status"
                onChange={handleChange('isActive')}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.background.paper,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.border.main,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Archived</MenuItem>
              </Select>
            </FormControl>
          </Stack>
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
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={loading}
            aria-label="Cancel edit ContentCreator"
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
            variant="contained"
            disabled={loading}
            aria-label="Update ContentCreator"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
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
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdminEditContentCreatorModal;

