import React from 'react';
import { Box, MenuItem, Paper, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const StarCamMissionFilters = ({
  search = '',
  status = '',
  categoryId = '',
  categories = [],
  onSearchChange,
  onStatusChange,
  onCategoryChange,
}) => {
  const theme = useTheme();

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
      <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' } }}>
        <TextField
          size="small"
          label="Search"
          placeholder="Search by mission id or title"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <TextField size="small" label="Status" select value={status} onChange={(e) => onStatusChange(e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Category"
          select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category._id} value={category._id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Paper>
  );
};

export default StarCamMissionFilters;

