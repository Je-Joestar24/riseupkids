import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Search as SearchIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';

/**
 * YoutubeFilters Component
 *
 * Search and isArchived filter for YouTube lives list.
 * Debounces search; on change applies filters and resets to page 1.
 */
const YoutubeFilters = ({ filters, onFiltersChange, disabled }) => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const debounceMs = 400;
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ search: searchInput.trim() || undefined, page: 1 });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps -- debounce only on searchInput

  // Sync search input when parent clears filters (e.g. clearLiveFilters)
  useEffect(() => {
    const next = (filters.search ?? '').toString();
    if (next !== searchInput) setSearchInput(next);
  }, [filters.search]);

  const handleArchivedChange = useCallback(
    (e) => {
      const v = e.target.value;
      const isArchived =
        v === '' ? undefined : v === 'true';
      onFiltersChange({ isArchived, page: 1 });
    },
    [onFiltersChange]
  );

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
      <TextField
        size="small"
        placeholder="Search by title or description..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: theme.palette.text.secondary }} />
            </InputAdornment>
          ),
          sx: {
            fontFamily: 'Quicksand, sans-serif',
            backgroundColor: theme.palette.background.paper,
            borderRadius: '8px',
            '& fieldset': { borderColor: theme.palette.border?.main || themeColors.border },
          },
        }}
        InputLabelProps={{ sx: { fontFamily: 'Quicksand, sans-serif' } }}
        sx={{ minWidth: 220 }}
        aria-label="Search lives"
      />
      <FormControl size="small" sx={{ minWidth: 160 }} disabled={disabled}>
        <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Status</InputLabel>
        <Select
          value={
            filters.isArchived === undefined
              ? ''
              : filters.isArchived === true
              ? 'true'
              : 'false'
          }
          onChange={handleArchivedChange}
          label="Status"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            backgroundColor: theme.palette.background.paper,
            borderRadius: '8px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.border?.main || themeColors.border,
            },
          }}
        >
          <MenuItem value="" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            All
          </MenuItem>
          <MenuItem value="false" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            Active
          </MenuItem>
          <MenuItem value="true" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            Archived
          </MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
};

export default YoutubeFilters;
