import React from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Clear as ClearIcon } from '@mui/icons-material';
import useParents from '../../../hooks/parentsHook';
import { USER_ROLES } from '../../../config/constants';
import { ADMIN_USER_ROLE_OPTIONS, isParentRole } from '../../../utils/adminUserRoles';

const AdminUsersFilters = () => {
  const theme = useTheme();
  const { filters, updateFilters, resetFilters, fetchParents } = useParents();

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      fetchParents(newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    if (field === 'role' && value !== USER_ROLES.PARENT) {
      newFilters.subscriptionStatus = undefined;
    }
    updateFilters(newFilters);
    fetchParents(newFilters);
  };

  const handleClearFilters = () => {
    resetFilters();
    fetchParents();
  };

  const hasActiveFilters =
    filters.search ||
    filters.isActive !== undefined ||
    filters.subscriptionStatus ||
    filters.role !== USER_ROLES.PARENT;

  const showSubscriptionFilter = isParentRole(filters.role);

  return (
    <Paper
      sx={{
        padding: 2.5,
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
        marginBottom: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search by name or email..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          size="small"
          sx={{ flex: 1, minWidth: 250 }}
        />

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={filters.role || USER_ROLES.PARENT}
            label="Role"
            onChange={(e) => handleFilterChange('role', e.target.value)}
          >
            {ADMIN_USER_ROLE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.isActive !== undefined ? String(filters.isActive) : ''}
            label="Status"
            onChange={(e) =>
              handleFilterChange(
                'isActive',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Archived</MenuItem>
          </Select>
        </FormControl>

        {showSubscriptionFilter && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Subscription</InputLabel>
            <Select
              value={filters.subscriptionStatus || ''}
              label="Subscription"
              onChange={(e) =>
                handleFilterChange('subscriptionStatus', e.target.value || undefined)
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
              <MenuItem value="past_due">Past Due</MenuItem>
            </Select>
          </FormControl>
        )}

        {hasActiveFilters && (
          <IconButton onClick={handleClearFilters} aria-label="Clear filters">
            <ClearIcon />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

export default AdminUsersFilters;
