import React from 'react';
import { Box, MenuItem, Pagination, Select, Stack, Typography } from '@mui/material';

const BooksBuilderPagination = ({ pagination, onPageChange, onLimitChange }) => {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const limit = pagination?.limit || 10;
  const total = pagination?.total || 0;

  return (
    <Box sx={{ mt: 2.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary' }}>
          {total} total books
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary' }}>
            Rows:
          </Typography>
          <Select
            size="small"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            sx={{ minWidth: 84, borderRadius: '10px' }}
          >
            {[6, 10, 20, 30].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
          <Pagination
            shape="rounded"
            color="primary"
            page={page}
            count={Math.max(1, totalPages)}
            onChange={(_, nextPage) => onPageChange(nextPage)}
          />
        </Stack>
      </Stack>
    </Box>
  );
};

export default BooksBuilderPagination;
