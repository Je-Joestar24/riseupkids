import React from 'react';
import { Box, Pagination, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useActivity from '../../../../hooks/activityHook';

/**
 * ActivityPaginations Component
 * 
 * Pagination controls for activities
 */
const ActivityPaginations = ({ pagination }) => {
  const theme = useTheme();
  const { updateFilters, fetchActivities, filters } = useActivity();

  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  const handlePageChange = async (event, value) => {
    updateFilters({ page: value });
    await fetchActivities({ ...filters, page: value });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
        padding: 2,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Pagination
          count={pagination.pages}
          page={pagination.page}
          onChange={handlePageChange}
          color="primary"
          sx={{
            '& .MuiPaginationItem-root': {
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          Page {pagination.page} of {pagination.pages} ({pagination.total} total)
        </Typography>
      </Stack>
    </Box>
  );
};

export default ActivityPaginations;

