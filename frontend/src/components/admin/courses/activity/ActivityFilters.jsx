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
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';

/**
 * ActivityFilters Component
 * 
 * Filter controls for activities list
 */
const ActivityFilters = () => {
  const theme = useTheme();
  const { filters, updateFilters, resetFilters, fetchContents } = useContent();

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.activitySearchTimeout);
    window.activitySearchTimeout = setTimeout(() => {
      fetchContents(filters.contentType || CONTENT_TYPES.BOOK, newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    updateFilters(newFilters);
    fetchContents(filters.contentType || CONTENT_TYPES.BOOK, newFilters);
  };

  const handleContentTypeChange = (value) => {
    const newFilters = {
      ...filters,
      contentType: value,
      page: 1,
      // Reset archive filter when switching away from activities
      isArchived: value === CONTENT_TYPES.ACTIVITY ? filters.isArchived : undefined,
    };
    updateFilters(newFilters);
    fetchContents(value || CONTENT_TYPES.BOOK, newFilters);
  };

  const handleClearFilters = () => {
    resetFilters();
    fetchContents(CONTENT_TYPES.BOOK);
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
        {/* Content Type Filter */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Content Type
          </InputLabel>
          <Select
            value={filters.contentType || CONTENT_TYPES.BOOK}
            label="Content Type"
            onChange={(e) => handleContentTypeChange(e.target.value)}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value={CONTENT_TYPES.BOOK}>Books</MenuItem>
            <MenuItem value={CONTENT_TYPES.ACTIVITY}>Activities</MenuItem>
            {/* Future: enable when frontend for other types is ready */}
            {/* <MenuItem value={CONTENT_TYPES.BOOK}>Books</MenuItem>
            <MenuItem value={CONTENT_TYPES.VIDEO}>Videos</MenuItem>
            <MenuItem value={CONTENT_TYPES.AUDIO_ASSIGNMENT}>Audio Assignments</MenuItem> */}
          </Select>
        </FormControl>

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

