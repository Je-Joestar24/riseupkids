import React from 'react';
import { Box, IconButton, Paper, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Clear } from '@mui/icons-material';

const PrintablesFilters = ({ search, placeholder, onSearchChange, onClear }) => {
  const theme = useTheme();
  const hasSearch = Boolean(search && search.trim());

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontFamily: 'Quicksand, sans-serif',
              backgroundColor: theme.palette.custom?.bgSecondary || theme.palette.background.default,
            },
          }}
        />
        {hasSearch ? (
          <IconButton onClick={onClear} aria-label="clear search">
            <Clear />
          </IconButton>
        ) : null}
      </Box>
    </Paper>
  );
};

export default PrintablesFilters;

