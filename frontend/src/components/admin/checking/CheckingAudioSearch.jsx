import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SearchOutlined, Clear as ClearIcon } from '@mui/icons-material';

/**
 * CheckingAudioSearch Component
 * 
 * Search and filter controls for audio submissions
 */
const CheckingAudioSearch = ({
  onSearch,
  onStatusFilterChange,
  currentSearch = '',
  currentStatus = '',
}) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = React.useState(currentSearch);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch(value);
  };

  const handleStatusChange = (e) => {
    onStatusFilterChange(e.target.value);
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onSearch('');
    onStatusFilterChange('');
  };

  const hasActiveFilters = searchValue || currentStatus;

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
          placeholder="Search by child name, assignment..."
          value={searchValue}
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
          InputProps={{
            startAdornment: <SearchOutlined sx={{ mr: 1, color: theme.palette.text.secondary }} />,
          }}
        />

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Status</InputLabel>
          <Select
            value={currentStatus}
            onChange={handleStatusChange}
            label="Status"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.border.main,
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            <MenuItem value="">All Submissions</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <IconButton
            onClick={handleClearFilters}
            aria-label="Clear filters"
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

export default CheckingAudioSearch;
