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
import { useExplore } from '../../../../hooks/exploreHook';
import { getVideoTypeOptions } from '../../../../constants/exploreVideoTypes';

/**
 * ExploreFilters Component
 *
 * Filter controls for explore content list
 * Includes search, type, videoType, category, isPublished, and isFeatured filters
 * Syncs with URL query parameters
 */
const ExploreFilters = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, updateFilters, resetFilters, fetchExploreContent } = useExplore();

  // Update URL params when filters change
  const updateUrlParams = (newFilters) => {
    const params = new URLSearchParams();
    
    // Only track videoType in URL (not type, which is always 'video')
    // Default to 'replay' if not specified
    const videoType = newFilters.videoType || 'replay';
    params.set('videoType', videoType);
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }
    if (newFilters.isPublished !== undefined) {
      params.set('isPublished', String(newFilters.isPublished));
    }
    if (newFilters.isFeatured !== undefined) {
      params.set('isFeatured', String(newFilters.isFeatured));
    }
    if (newFilters.page && newFilters.page > 1) {
      params.set('page', String(newFilters.page));
    }
    if (newFilters.limit && newFilters.limit !== 10) {
      params.set('limit', String(newFilters.limit));
    }
    
    setSearchParams(params);
  };

  const handleSearchChange = (event) => {
    const newFilters = { ...filters, search: event.target.value, page: 1 };
    updateFilters(newFilters);
    updateUrlParams(newFilters);
    // Debounce search - fetch after user stops typing
    clearTimeout(window.exploreSearchTimeout);
    window.exploreSearchTimeout = setTimeout(() => {
      fetchExploreContent(newFilters);
    }, 500);
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    updateFilters(newFilters);
    updateUrlParams(newFilters);
    fetchExploreContent(newFilters);
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      type: 'video',
      videoType: 'replay', // Default to replay
      search: undefined,
      isPublished: undefined,
      isFeatured: undefined,
      page: 1,
      limit: 10,
    };
    resetFilters();
    updateUrlParams(defaultFilters);
    fetchExploreContent(defaultFilters);
  };

  const hasActiveFilters =
    filters.search ||
    (filters.videoType && filters.videoType !== 'replay') || // Only show clear if not default
    filters.isPublished !== undefined ||
    filters.isFeatured !== undefined;

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
            placeholder="Search by title, description, or category..."
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

        {/* Type Filter */}
{/*         <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Type
          </InputLabel>
          <Select
            value={filters.type || ''}
            label="Type"
            onChange={(e) =>
              handleFilterChange('type', e.target.value === '' ? undefined : e.target.value)
            }
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="video">Video</MenuItem>
            <MenuItem value="lesson">Lesson</MenuItem>
            <MenuItem value="activity">Activity</MenuItem>
            <MenuItem value="activity_group">Activity Group</MenuItem>
            <MenuItem value="book">Book</MenuItem>
            <MenuItem value="audio">Audio</MenuItem>
          </Select>
        </FormControl> */}

        {/* Video Type Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Video Type
          </InputLabel>
          <Select
            value={filters.videoType || 'replay'}
            label="Video Type"
            onChange={(e) =>
              handleFilterChange('videoType', e.target.value)
            }
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            {getVideoTypeOptions().map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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

        {/* Featured Status Filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Featured
          </InputLabel>
          <Select
            value={filters.isFeatured !== undefined ? String(filters.isFeatured) : ''}
            label="Featured"
            onChange={(e) =>
              handleFilterChange(
                'isFeatured',
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
            <MenuItem value="true">Featured</MenuItem>
            <MenuItem value="false">Not Featured</MenuItem>
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

export default ExploreFilters;
