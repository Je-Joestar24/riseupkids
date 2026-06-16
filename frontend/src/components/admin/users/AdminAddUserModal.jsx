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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';
import useParents from '../../../hooks/parentsHook';
import { USER_ROLES } from '../../../config/constants';
import { ADMIN_USER_ROLE_OPTIONS, isParentRole } from '../../../utils/adminUserRoles';

const AdminAddUserModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { createUser, loading, filters, updateFilters, fetchParents } = useParents();

  const [formData, setFormData] = useState({
    role: USER_ROLES.PARENT,
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
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
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await createUser(formData);
      const createdRole = formData.role;
      const newFilters = {
        ...filters,
        role: createdRole,
        page: 1,
        ...(isParentRole(createdRole) ? {} : { subscriptionStatus: undefined }),
      };
      updateFilters(newFilters);
      await fetchParents(newFilters);
      handleClose();
    } catch (_error) {
      // handled in hook
    }
  };

  const handleClose = () => {
    setFormData({
      role: USER_ROLES.PARENT,
      name: '',
      email: '',
      password: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.border.main}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        Add New User
        <Button onClick={handleClose} sx={{ minWidth: 'auto', p: 0.5 }}>
          <CloseIcon />
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={handleChange('role')}
              >
                {ADMIN_USER_ROLE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Name"
              value={formData.name}
              onChange={handleChange('name')}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
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
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              fullWidth
              required
              error={!!errors.password}
              helperText={errors.password}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdminAddUserModal;
