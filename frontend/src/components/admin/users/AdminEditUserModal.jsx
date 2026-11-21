import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Alert,
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
import { USER_ROLES } from '../../../config/constants';
import { isParentRole } from '../../../utils/adminUserRoles';
import { getAdminAccountDisplayStatus } from '../../../utils/accountDisplayStatus';
import { diffAreas, joinLabels, sameAreaList } from '../../../utils/accessAreaOptions';
import { showConfirmationDialog } from '../../../store/slices/uiSlice';
import ContentCreatorAccessChecklist from './ContentCreatorAccessChecklist';

/**
 * AdminEditUserModal Component
 * 
 * Edit modal for updating parent user information
 */
const AdminEditUserModal = ({ open, onClose, parentId, userRole }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { fetchParent, currentParent, updateParentData, loading, filters, accessAreaOptions, loadAccessAreas } = useParents();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
    subscriptionStatus: 'inactive',
  });
  const [errors, setErrors] = useState({});
  // A content creator's access list (what she has today, and what is ticked now)
  const [originalAreas, setOriginalAreas] = useState([]);
  const [accessAreas, setAccessAreas] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  const resolvedRole = currentParent?.role || userRole || filters.role;
  const isCreator = resolvedRole === USER_ROLES.CONTENT_CREATOR;

  useEffect(() => {
    if (open && parentId) {
      fetchParent(parentId, userRole || filters.role);
    }
  }, [open, parentId, userRole, filters.role]);

  // The access checkboxes are only needed for a content creator
  useEffect(() => {
    if (open && isCreator) loadAccessAreas().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCreator]);

  useEffect(() => {
    if (currentParent) {
      setFormData({
        name: currentParent.name || '',
        email: currentParent.email || '',
        isActive: currentParent.isActive !== undefined ? currentParent.isActive : true,
        subscriptionStatus: currentParent.subscriptionStatus || 'inactive',
      });
      const saved = Array.isArray(currentParent.accessAreas) ? currentParent.accessAreas : [];
      setOriginalAreas(saved);
      setAccessAreas(saved);
      setSubmitError(null);
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

  const accessChanged = isCreator && !sameAreaList(accessAreas, originalAreas);

  const saveChanges = async () => {
    setSubmitError(null);
    try {
      const role = currentParent?.role || userRole || filters.role;
      const payload = {
        name: formData.name,
        email: formData.email,
        isActive: formData.isActive,
      };
      if (isParentRole(role)) {
        payload.subscriptionStatus = formData.subscriptionStatus;
      }
      // Only sent when the ticks were changed: editing a name must not rewrite her access
      if (accessChanged) {
        payload.accessAreas = accessAreas;
      }
      await updateParentData(parentId, payload, role);
      onClose();
    } catch (error) {
      // The notice is shown by the hook; the reason is also kept here, with what was typed and ticked
      setSubmitError(error?.message || (typeof error === 'string' ? error : 'Failed to update user'));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (accessChanged && accessAreas.length === 0) {
      setSubmitError('Choose at least one area. To stop this person using the site, archive them.');
      return;
    }

    // Taking something away is confirmed first
    const { removed } = diffAreas(originalAreas, accessAreas, accessAreaOptions.areas);
    if (accessChanged && removed.length > 0) {
      const name = formData.name.trim() || 'This person';
      dispatch(
        showConfirmationDialog({
          title: 'Remove access?',
          message: `${name} will lose access to ${joinLabels(removed, accessAreaOptions.areas)} straight away. Content ${name} created stays in the system. Continue?`,
          onConfirm: saveChanges,
        })
      );
      return;
    }

    saveChanges();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      isActive: true,
      subscriptionStatus: 'inactive',
    });
    setErrors({});
    setSubmitError(null);
    setOriginalAreas([]);
    setAccessAreas([]);
    onClose();
  };

  const accountStatus = currentParent ? getAdminAccountDisplayStatus(currentParent) : null;
  const statusFieldLocked = Boolean(accountStatus?.deletionRequest);

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
          Edit User
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
            {submitError && <Alert severity="error">{submitError}</Alert>}

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
            <FormControl fullWidth disabled={statusFieldLocked}>
              <InputLabel
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                Status
              </InputLabel>
              <Select
                value={statusFieldLocked ? String(currentParent?.isActive ?? false) : String(formData.isActive)}
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
              {statusFieldLocked && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    display: 'block',
                    fontFamily: 'Quicksand, sans-serif',
                    color: theme.palette.warning.main,
                  }}
                >
                  Status is locked while account deletion is {accountStatus?.label?.toLowerCase()}.
                </Typography>
              )}
            </FormControl>

            {/* Content creators only: what she can use */}
            {isCreator && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  What this person can use
                </Typography>
                <ContentCreatorAccessChecklist
                  areas={accessAreaOptions.areas}
                  value={accessAreas}
                  onChange={setAccessAreas}
                  original={originalAreas}
                  disabled={loading}
                  loading={accessAreaOptions.loading}
                  loadError={accessAreaOptions.error}
                  onRetry={() => loadAccessAreas().catch(() => {})}
                />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Changes apply the next time they open a page.
                </Typography>
              </Stack>
            )}

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

