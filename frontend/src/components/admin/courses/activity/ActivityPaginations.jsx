import React from 'react';
import {
  Box,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useActivity from '../../../../hooks/activityHook';

/**
 * ActivityPaginations Component
 * 
 * Pagination controls for activities list
 */
const ActivityPaginations = () => {
  const theme = useTheme();
  const { pagination, filters, updateFilters, fetchActivities } = useActivity();

  if (!pagination) {
    return null;
  }

  const handlePageChange = (event, newPage) => {
    const newFilters = { ...filters, page: newPage };
    updateFilters(newFilters);
    fetchActivities(newFilters);
  };

  const handleLimitChange = (event) => {
    const newFilters = {
      ...filters,
      page: 1,
      limit: parseInt(event.target.value, 10),
    };
    updateFilters(newFilters);
    fetchActivities(newFilters);
  };

  const itemsPerPage = pagination.limit || 8;
  const currentPage = pagination.page || 1;
  const totalItems = pagination.total || 0;
  const totalPages = pagination.pages || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 3,
        marginBottom: 2,
        padding: 2.5,
        backgroundColor: 'transparent',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {/* Items Per Page */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            fontSize: '0.875rem',
          }}
        >
          Items per page:
        </Typography>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={itemsPerPage}
            onChange={handleLimitChange}
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
            <MenuItem value={8}>8</MenuItem>
            <MenuItem value={16}>16</MenuItem>
            <MenuItem value={24}>24</MenuItem>
            <MenuItem value={32}>32</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Pagination Info */}
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          color: theme.palette.text.secondary,
          fontSize: '0.875rem',
        }}
      >
        Showing {startItem} to {endItem} of {totalItems} activities
      </Typography>

      {/* Pagination Controls */}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        shape="rounded"
        sx={{
          '& .MuiPaginationItem-root': {
            fontFamily: 'Quicksand, sans-serif',
            '&.Mui-selected': {
              backgroundColor: `${theme.palette.primary.main}20`,
              color: theme.palette.primary.main,
              fontWeight: 600,
            },
            '&:hover': {
              backgroundColor: `${theme.palette.primary.main}10`,
            },
          },
        }}
      />
    </Box>
  );
};

export default ActivityPaginations;

