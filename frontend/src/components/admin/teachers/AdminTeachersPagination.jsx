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
import useTeachers from '../../../hooks/teachersHook';

/**
 * AdminTeachersPagination Component
 * 
 * Pagination controls for teachers list
 */
const AdminTeachersPagination = () => {
  const theme = useTheme();
  const { pagination, filters, updateFilters, fetchTeachers } = useTeachers();

  const handlePageChange = (event, newPage) => {
    const newFilters = { ...filters, page: newPage };
    updateFilters(newFilters);
    fetchTeachers(newFilters);
  };

  const handleLimitChange = (event) => {
    const newFilters = {
      ...filters,
      page: 1,
      limit: parseInt(event.target.value, 10),
    };
    updateFilters(newFilters);
    fetchTeachers(newFilters);
  };

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
            value={pagination.itemsPerPage || 10}
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
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
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
        Showing {pagination.totalItems === 0 ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
        {pagination.totalItems} teachers
      </Typography>

      {/* Pagination Controls */}
      <Pagination
        count={pagination.totalPages}
        page={pagination.currentPage}
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

export default AdminTeachersPagination;

