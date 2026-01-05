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
import useActivity from '../../../../hooks/activityHook';

/**
 * ActivityFilters Component
 * 
 * Filter controls for activities list
 */
const ActivityFilters = () => {
  const theme = useTheme();
  const { filters, updateFilters, resetFilters, fetchActivities } = useActivity();

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.activitySearchTimeout);
    window.activitySearchTimeout = setTimeout(() => {
      fetchActivities(newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    updateFilters(newFilters);
    fetchActivities(newFilters);
  };

  const handleClearFilters = () => {
    resetFilters();
    fetchActivities();
  };

  const hasActiveFilters =
    filters.search ||
    filters.isPublished !== undefined ||
    filters.isArchived !== undefined;

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
          placeholder="Search by title or description..."
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

        {/* Published Status Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Status
          </InputLabel>
          <Select
            value={filters.isPublished !== undefined ? String(filters.isPublished) : ''}
            label="Status"
            onChange={(e) =>
              handleFilterChange(
                'isPublished',
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
            <MenuItem value="true">Published</MenuItem>
            <MenuItem value="false">Draft</MenuItem>
          </Select>
        </FormControl>

        {/* Archived Status Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Archive
          </InputLabel>
          <Select
            value={filters.isArchived !== undefined ? String(filters.isArchived) : ''}
            label="Archive"
            onChange={(e) =>
              handleFilterChange(
                'isArchived',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value="">Active</MenuItem>
            <MenuItem value="true">Archived</MenuItem>
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

export default ActivityFilters;

