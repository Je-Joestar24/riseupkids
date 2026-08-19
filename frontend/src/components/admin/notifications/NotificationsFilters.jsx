import React, { useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const NotificationsFilters = ({
  status,
  type,
  search,
  types = [],
  statuses = [],
  onStatusChange,
  onTypeChange,
  onSearch,
}) => {
  const theme = useTheme();
  const [localSearch, setLocalSearch] = useState(search || '');

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', marginBottom: 2 }}>
      <TextField
        size="small"
        placeholder="Search internal name..."
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        onBlur={() => onSearch?.(localSearch)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch?.(localSearch);
        }}
        inputProps={{ 'aria-label': 'Search notification campaigns' }}
        sx={{
          minWidth: 240,
          '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: theme.palette.background.paper },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="notification-status-filter">Status</InputLabel>
        <Select
          labelId="notification-status-filter"
          label="Status"
          value={status || ''}
          onChange={(e) => onStatusChange?.(e.target.value)}
        >
          <MenuItem value="">All statuses</MenuItem>
          {statuses.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="notification-type-filter">Type</InputLabel>
        <Select
          labelId="notification-type-filter"
          label="Type"
          value={type || ''}
          onChange={(e) => onTypeChange?.(e.target.value)}
        >
          <MenuItem value="">All types</MenuItem>
          {types.map((item) => (
            <MenuItem key={item.value} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default NotificationsFilters;
