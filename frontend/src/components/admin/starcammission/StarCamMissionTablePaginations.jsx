import React from 'react';
import { Box, FormControl, MenuItem, Pagination, Select, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const StarCamMissionTablePaginations = ({ pagination, onPageChange, onLimitChange }) => {
  const theme = useTheme();
  if (!pagination) return null;

  const page = Number(pagination.page || 1);
  const limit = Number(pagination.limit || 5);
  const total = Number(pagination.total || 0);
  const totalPages = Math.max(Number(pagination.totalPages || 1), 1);

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <Box
      sx={{
        mt: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
          Per page
        </Typography>
        <FormControl size="small" sx={{ minWidth: 84 }}>
          <Select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
        Showing {startItem} - {endItem} of {total} missions
      </Typography>

      <Pagination
        page={page}
        count={totalPages}
        onChange={(_, value) => onPageChange(value)}
        shape="rounded"
        color="primary"
      />
    </Box>
  );
};

export default StarCamMissionTablePaginations;

