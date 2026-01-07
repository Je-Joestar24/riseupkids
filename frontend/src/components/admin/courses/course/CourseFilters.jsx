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
import useCourse from '../../../../hooks/courseHook';

/**
 * CourseFilters Component
 *
 * Filter controls for courses/content collections list
 * Includes search and published status filters
 */
const CourseFilters = () => {
  const theme = useTheme();
  const { filters, updateFilters, resetFilters, fetchCourses } = useCourse();

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.courseSearchTimeout);
    window.courseSearchTimeout = setTimeout(() => {
      fetchCourses(newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    updateFilters(newFilters);
    fetchCourses(newFilters);
  };

  const handleClearFilters = () => {
    resetFilters();
    fetchCourses();
  };

  const hasActiveFilters =
    filters.search ||
    filters.isPublished !== undefined ||
    filters.isArchived !== false;

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
        <div style={{ flex: 1, minWidth: 250 }}>
          <TextField
            placeholder="Search courses by title or description..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            size="small"
            fullWidth
            sx={{
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
        </div>

        {/* Published Status Filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
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
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Archive
          </InputLabel>
          <Select
            value={filters.isArchived === true ? 'true' : filters.isArchived === false ? 'false' : 'all'}
            label="Archive"
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange(
                'isArchived',
                value === 'all' ? undefined : value === 'true'
              );
            }}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="false">Active</MenuItem>
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

export default CourseFilters;

