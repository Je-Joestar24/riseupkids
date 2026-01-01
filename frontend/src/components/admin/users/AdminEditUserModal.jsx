import React, { useState, useEffect } from 'react';
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
import useParents from '../../../hooks/parentsHook';

/**
 * AdminEditUserModal Component
 * 
 * Edit modal for updating parent user information
 */
const AdminEditUserModal = ({ open, onClose, parentId }) => {
  const theme = useTheme();
  const { fetchParent, currentParent, updateParentData, loading } = useParents();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
    subscriptionStatus: 'inactive',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && parentId) {
      fetchParent(parentId);
    }
  }, [open, parentId]);

  useEffect(() => {
    if (currentParent) {
      setFormData({
        name: currentParent.name || '',
        email: currentParent.email || '',
        isActive: currentParent.isActive !== undefined ? currentParent.isActive : true,
        subscriptionStatus: currentParent.subscriptionStatus || 'inactive',
      });
    }
  }, [currentParent]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'isActive' ? value === 'true' : value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
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
      await updateParentData(parentId, formData);
      onClose();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      isActive: true,
      subscriptionStatus: 'inactive',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 0,
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
          Edit Parent
        </Typography>
        <Button
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
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ padding: 3 }}>
          <Stack spacing={2.5}>
            {/* Name Field */}
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

            {/* Email Field */}
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

            {/* Status Field */}
            <FormControl fullWidth>
              <InputLabel
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                Status
              </InputLabel>
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

            {/* Subscription Status Field */}
{/*             <FormControl fullWidth>
              <InputLabel
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                Subscription Status
              </InputLabel>
              <Select
                value={formData.subscriptionStatus}
                label="Subscription Status"
                onChange={handleChange('subscriptionStatus')}
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
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="canceled">Canceled</MenuItem>
                <MenuItem value="past_due">Past Due</MenuItem>
              </Select>
            </FormControl> */}
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
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdminEditUserModal;

