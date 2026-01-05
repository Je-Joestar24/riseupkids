import React, { useEffect } from 'react';
import { Box, Paper, Stack, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useActivity from '../../../../hooks/activityHook';

/**
 * ActivityFilters Component
 * 
 * Filter section for activities
 */
const ActivityFilters = () => {
  const theme = useTheme();
  const { filters, updateFilters, fetchActivities } = useActivity();


  const handlePublishedChange = (event) => {
    updateFilters({ isPublished: event.target.value === 'all' ? undefined : event.target.value === 'true', page: 1 });
  };

  const handleSearchChange = (event) => {
    updateFilters({ search: event.target.value, page: 1 });
  };

  // Fetch activities when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchActivities();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.isPublished, filters.search]);

  return (
    <Paper
      sx={{
        padding: 2.5,
        marginBottom: 3,
        borderRadius: '12px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
      }}
    >
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
        {/* Search */}
        <TextField
          placeholder="Search activities..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          size="small"
          sx={{
            minWidth: 250,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontFamily: 'Quicksand, sans-serif',
            },
          }}
        />

        {/* Published Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Status</InputLabel>
          <Select
            value={filters.isPublished === undefined ? 'all' : filters.isPublished ? 'true' : 'false'}
            onChange={handlePublishedChange}
            label="Status"
            sx={{
              borderRadius: '10px',
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="true">Published</MenuItem>
            <MenuItem value="false">Draft</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Paper>
  );
};

export default ActivityFilters;

