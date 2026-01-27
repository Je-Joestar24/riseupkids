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
  Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Clear as ClearIcon } from '@mui/icons-material';
import useMeetings from '../../../hooks/meetingHooks';

/**
 * MeetingFilters Component
 * 
 * Filter controls for meetings list
 * Includes search, status, archived, and date range filters
 */
const MeetingFilters = () => {
  const theme = useTheme();
  const { filters, updateFilters, clearAllFilters, fetchMeetings } = useMeetings();

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.meetingSearchTimeout);
    window.meetingSearchTimeout = setTimeout(() => {
      fetchMeetings(newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    updateFilters(newFilters);
    fetchMeetings(newFilters);
  };

  const handleClearFilters = () => {
    clearAllFilters();
    fetchMeetings();
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== undefined ||
    filters.isArchived !== false ||
    filters.startDate ||
    filters.endDate;

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
      <Stack spacing={2}>
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
            placeholder="Search meetings by title or description..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            size="small"
            sx={{
              flex: 1,
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                fontFamily: 'Quicksand, sans-serif',
                borderRadius: '8px',
                backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
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

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Status</InputLabel>
            <Select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              label="Status"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                borderRadius: '8px',
                backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
              }}
            >
              <MenuItem value="" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                All Statuses
              </MenuItem>
              <MenuItem value="scheduled" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Scheduled
              </MenuItem>
              <MenuItem value="completed" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Completed
              </MenuItem>
              <MenuItem value="cancelled" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Cancelled
              </MenuItem>
            </Select>
          </FormControl>

          {/* Archived Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Archived</InputLabel>
            <Select
              value={filters.isArchived === true ? 'archived' : filters.isArchived === false ? 'active' : 'all'}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange(
                  'isArchived',
                  value === 'archived' ? true : value === 'active' ? false : undefined
                );
              }}
              label="Archived"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                borderRadius: '8px',
                backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
              }}
            >
              <MenuItem value="active" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Active Only
              </MenuItem>
              <MenuItem value="archived" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                Archived Only
              </MenuItem>
              <MenuItem value="all" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                All Meetings
              </MenuItem>
            </Select>
          </FormControl>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <IconButton
              onClick={handleClearFilters}
              size="small"
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
              aria-label="Clear filters"
            >
              <ClearIcon />
            </IconButton>
          )}
        </Box>

        {/* Date Range Filters */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            label="Start Date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
            size="small"
            InputLabelProps={{
              shrink: true,
              sx: { fontFamily: 'Quicksand, sans-serif' },
            }}
            InputProps={{
              sx: {
                fontFamily: 'Quicksand, sans-serif',
                borderRadius: '8px',
                backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
              },
            }}
          />

          <TextField
            label="End Date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
            size="small"
            InputLabelProps={{
              shrink: true,
              sx: { fontFamily: 'Quicksand, sans-serif' },
            }}
            InputProps={{
              sx: {
                fontFamily: 'Quicksand, sans-serif',
                borderRadius: '8px',
                backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
              },
            }}
          />
        </Box>
      </Stack>
    </Paper>
  );
};

export default MeetingFilters;
