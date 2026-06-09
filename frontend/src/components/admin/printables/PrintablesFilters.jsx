import React from 'react';
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Clear } from '@mui/icons-material';

const PrintablesFilters = ({
  search,
  isPublished,
  placeholder,
  onSearchChange,
  onPublishedChange,
  onClear,
}) => {
  const theme = useTheme();
  const hasSearch = Boolean(search && search.trim());
  const hasPublishedFilter = isPublished !== undefined && isPublished !== null && isPublished !== '';
  const hasActiveFilters = hasSearch || hasPublishedFilter;

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[1],
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          sx={{
            flex: 1,
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontFamily: 'Quicksand, sans-serif',
              backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Status</InputLabel>
          <Select
            value={hasPublishedFilter ? String(isPublished) : ''}
            label="Status"
            onChange={(e) => {
              const value = e.target.value;
              onPublishedChange?.(value === '' ? undefined : value === 'true');
            }}
            aria-label="Filter modules by publish status"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '10px',
              backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Published</MenuItem>
            <MenuItem value="false">Draft</MenuItem>
          </Select>
        </FormControl>
        {hasActiveFilters ? (
          <IconButton onClick={onClear} aria-label="Clear filters">
            <Clear />
          </IconButton>
        ) : null}
      </Box>
    </Paper>
  );
};

export default PrintablesFilters;

