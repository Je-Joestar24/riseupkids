import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchOutlined from '@mui/icons-material/SearchOutlined';

const ModuleAccessFilters = ({ search, hasOverride, onSearch, onHasOverrideChange }) => {
  const theme = useTheme();
  const [localSearch, setLocalSearch] = useState(search || '');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch?.(localSearch);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        marginBottom: 2,
      }}
    >
      <TextField
        size="small"
        placeholder="Search child or parent email..."
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSearch?.(localSearch)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{
          minWidth: 280,
          fontFamily: 'Quicksand, sans-serif',
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            backgroundColor: theme.palette.background.paper,
          },
        }}
        inputProps={{ 'aria-label': 'Search children' }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(hasOverride)}
            onChange={(e) => onHasOverrideChange?.(e.target.checked)}
            color="warning"
            inputProps={{ 'aria-label': 'Show only children with overrides' }}
          />
        }
        label="Has manual override"
        sx={{
          '& .MuiFormControlLabel-label': {
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '0.875rem',
          },
        }}
      />
    </Box>
  );
};

export default ModuleAccessFilters;
