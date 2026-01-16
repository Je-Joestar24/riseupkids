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
import { useSearchParams } from 'react-router-dom';
import useKidsWall from '../../../hooks/kidsWallHook';

/**
 * KidsWallFilters Component
 *
 * Filter controls for KidsWall posts list
 * Includes approval status, child name search, and content search filters
 * Syncs with URL query parameters
 */
const KidsWallFilters = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, updateFilters, resetFilters, fetchPosts } = useKidsWall();

  // Update URL params when filters change
  const updateUrlParams = (newFilters) => {
    const params = new URLSearchParams();
    
    // Default to 'pending' when empty
    const isApproved = newFilters.isApproved || 'pending';
    if (isApproved !== 'pending') {
      params.set('isApproved', isApproved);
    }
    if (newFilters.childName) {
      params.set('childName', newFilters.childName);
    }
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }
    if (newFilters.page && newFilters.page > 1) {
      params.set('page', String(newFilters.page));
    }
    if (newFilters.limit && newFilters.limit !== 10) {
      params.set('limit', String(newFilters.limit));
    }
    
    setSearchParams(params);
  };

  const handleChildNameChange = (event) => {
    const newFilters = { ...filters, childName: event.target.value, page: 1 };
    updateFilters(newFilters);
    updateUrlParams(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.kidsWallChildNameTimeout);
    window.kidsWallChildNameTimeout = setTimeout(() => {
      fetchPosts(newFilters);
    }, 500);
  };

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    updateUrlParams(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.kidsWallSearchTimeout);
    window.kidsWallSearchTimeout = setTimeout(() => {
      fetchPosts(newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    updateFilters(newFilters);
    updateUrlParams(newFilters);
    fetchPosts(newFilters);
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      isApproved: 'pending', // Default to pending
      childName: undefined,
      search: undefined,
      page: 1,
      limit: 10,
    };
    resetFilters();
    updateUrlParams(defaultFilters);
    fetchPosts();
  };

  const hasActiveFilters =
    filters.isApproved !== 'pending' ||
    filters.childName ||
    filters.search;

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
        {/* Approval Status Filter */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Approval Status
          </InputLabel>
          <Select
            value={filters.isApproved || 'pending'}
            label="Approval Status"
            onChange={(e) =>
              handleFilterChange('isApproved', e.target.value || 'pending')
            }
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="true">Approved</MenuItem>
            <MenuItem value="false">Rejected</MenuItem>
            <MenuItem value="">All</MenuItem>
          </Select>
        </FormControl>

        {/* Child Name Search */}
        <TextField
          placeholder="Search by child name..."
          value={filters.childName || ''}
          onChange={handleChildNameChange}
          size="small"
          sx={{
            minWidth: 200,
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

        {/* Content Search */}
        <TextField
          placeholder="Search in title or content..."
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

export default KidsWallFilters;
