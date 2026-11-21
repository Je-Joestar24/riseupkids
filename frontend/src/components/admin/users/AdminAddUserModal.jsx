import React, { useState } from 'react';
import {
  Alert,
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
import ContentCreatorAccessChecklist from './ContentCreatorAccessChecklist';

const EMPTY_FORM = { role: USER_ROLES.PARENT, name: '', email: '', password: '' };

/**
 * Add New User. A parent or a teacher is one step, as ever. A CONTENT CREATOR has a second step: "Choose what
 * [name] can use" (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md). Nothing is saved until Create User; Back keeps what was typed.
 */
const AdminAddUserModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { createUser, loading, filters, updateFilters, fetchParents, accessAreaOptions, loadAccessAreas } = useParents();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [accessAreas, setAccessAreas] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  const isCreator = formData.role === USER_ROLES.CONTENT_CREATOR;
  const onAccessStep = isCreator && step === 2;

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

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setStep(1);
    setAccessAreas([]);
    setSubmitError(null);
    onClose();
  };

  const create = async () => {
    setSubmitError(null);
    try {
      await createUser({ ...formData, accessAreas });
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
    } catch (error) {
      // The notice is shown by the hook; the reason is also kept here, next to what was ticked
      const message = error?.message || (typeof error === 'string' ? error : 'Failed to create user');
      if (error?.status === 409) {
        // The email is already used: that is fixed on the first step
        setStep(1);
        setErrors((prev) => ({ ...prev, email: message }));
      } else {
        setSubmitError(message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onAccessStep) {
      if (accessAreas.length === 0) return;
      await create();
      return;
    }
    if (!validateForm()) return;
    if (isCreator) {
      setSubmitError(null);
      setStep(2);
      loadAccessAreas().catch(() => {});
      return;
    }
    await create();
  };

  const title = onAccessStep ? `Choose what ${formData.name.trim() || 'this person'} can use` : 'Add New User';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth aria-labelledby="add-user-title">
      <DialogTitle
        id="add-user-title"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.border.main}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {title}
        <Button onClick={handleClose} sx={{ minWidth: 'auto', p: 0.5 }} aria-label="Close">
          <CloseIcon />
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          {onAccessStep ? (
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Tick what this person can use. What is not ticked will not appear in their menu. You can change this at any time.
              </Typography>
              <ContentCreatorAccessChecklist
                areas={accessAreaOptions.areas}
                value={accessAreas}
                onChange={setAccessAreas}
                disabled={loading}
                loading={accessAreaOptions.loading}
                loadError={accessAreaOptions.error}
                onRetry={() => loadAccessAreas().catch(() => {})}
              />
              {accessAreas.length === 0 && accessAreaOptions.areas.length > 0 && (
                <Typography variant="body2" color="error">
                  Choose at least one area.
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select value={formData.role} label="Role" onChange={handleChange('role')}>
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
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          {onAccessStep ? (
            <>
              <Button
                onClick={() => {
                  setSubmitError(null);
                  setStep(1);
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" variant="contained" disabled={loading || accessAreas.length === 0}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {isCreator ? 'Next' : loading ? 'Creating...' : 'Create User'}
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdminAddUserModal;
