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
import useMeetings from '../../../hooks/meetingHooks';

/**
 * MeetingPagination Component
 *
 * Pagination controls for meetings list.
 * Always visible, with items-per-page selector and range summary.
 */
const MeetingPagination = () => {
  const theme = useTheme();
  const { pagination, filters, updateFilters, fetchMeetings } = useMeetings();

  if (!pagination) {
    return null;
  }

  const handlePageChange = (event, newPage) => {
    const newFilters = { ...filters, page: newPage };
    updateFilters(newFilters);
    fetchMeetings(newFilters);
  };

  const handleLimitChange = (event) => {
    const newFilters = {
      ...filters,
      page: 1,
      limit: parseInt(event.target.value, 10),
    };
    updateFilters(newFilters);
    fetchMeetings(newFilters);
  };

  const itemsPerPage = pagination.limit || 10;
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
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Per Page</InputLabel>
          <Select
            value={itemsPerPage}
            onChange={handleLimitChange}
            label="Per Page"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
            }}
          >
            <MenuItem value={10} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              10
            </MenuItem>
            <MenuItem value={25} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              25
            </MenuItem>
            <MenuItem value={50} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              50
            </MenuItem>
            <MenuItem value={100} sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              100
            </MenuItem>
          </Select>
        </FormControl>

        {/* Pagination Info */}
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            fontSize: '0.875rem',
          }}
        >
          Showing {startItem} to {endItem} of {totalItems} meetings
        </Typography>
      </Box>

      {/* Pagination Controls */}
      <Pagination
        count={totalPages || 1}
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

export default MeetingPagination;
