import React from 'react';
import { Box, MenuItem, Pagination, Select, Stack, Typography } from '@mui/material';
import { pageRange } from '../../../utils/experienceAdminFormat';

export const PAGE_SIZE_OPTIONS = [8, 12, 24, 48];

/**
 * Rows per page, "Showing x to y of z", and the page buttons. Hidden when there is nothing to page.
 *
 * @param {{ pagination: { page: number, limit: number, total: number, pages: number }|null, onPageChange: (page: number) => void, onLimitChange: (limit: number) => void }} props
 */
const ExperiencesPagination = ({ pagination, onPageChange, onLimitChange }) => {
  if (!pagination || !(Number(pagination.total) > 0)) return null;

  const { from, to, total } = pageRange(pagination);
  const page = pagination.page || 1;
  const pages = Math.max(1, pagination.pages || 1);
  const limit = pagination.limit || PAGE_SIZE_OPTIONS[1];
  // A size that is not in the list (an old bookmark) is still shown instead of an empty select.
  const sizes = PAGE_SIZE_OPTIONS.includes(limit) ? PAGE_SIZE_OPTIONS : [...PAGE_SIZE_OPTIONS, limit].sort((a, b) => a - b);

  return (
    <Box sx={{ mt: 2.5 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary' }}>
          Showing {from} to {to} of {total} {total === 1 ? 'experience' : 'experiences'}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary' }}>
            Rows:
          </Typography>
          <Select
            size="small"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            inputProps={{ 'aria-label': 'Rows per page' }}
            sx={{ minWidth: 84, borderRadius: '10px' }}
          >
            {sizes.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
          <Pagination
            shape="rounded"
            color="primary"
            page={Math.min(page, pages)}
            count={pages}
            onChange={(_, next) => onPageChange(next)}
          />
        </Stack>
      </Stack>
    </Box>
  );
};

export default ExperiencesPagination;
