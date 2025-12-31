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

/**
 * AdminUsersFilters Component
 * 
 * Filter controls for parent users list
 */
const AdminUsersFilters = () => {
  const theme = useTheme();
  const { filters, updateFilters, resetFilters, fetchParents } = useParents();

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      fetchParents(newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
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
    filters.subscriptionStatus;

  return (
    <Paper
      sx={{
        padding: 2.5,
        borderRadius: '12px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        marginBottom: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search Field */}
        <TextField
          placeholder="Search by name or email..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          size="small"
          sx={{
            flex: 1,
            minWidth: 250,
            '& .MuiOutlinedInput-root': {
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
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
          }}
        />

        {/* Active Status Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Status
          </InputLabel>
          <Select
            value={filters.isActive !== undefined ? String(filters.isActive) : ''}
            label="Status"
            onChange={(e) =>
              handleFilterChange(
                'isActive',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Archived</MenuItem>
          </Select>
        </FormControl>

        {/* Subscription Status Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Subscription
          </InputLabel>
          <Select
            value={filters.subscriptionStatus || ''}
            label="Subscription"
            onChange={(e) =>
              handleFilterChange('subscriptionStatus', e.target.value || undefined)
            }
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
            <MenuItem value="past_due">Past Due</MenuItem>
          </Select>
        </FormControl>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <IconButton
            onClick={handleClearFilters}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: `${theme.palette.error.main}20`,
                color: theme.palette.error.main,
              },
            }}
          >
            <ClearIcon />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

export default AdminUsersFilters;

