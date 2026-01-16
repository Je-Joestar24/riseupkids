import React from 'react';
import {
  Box,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import useKidsWall from '../../../hooks/kidsWallHook';

/**
 * KidsWallPagination Component
 *
 * Pagination controls for KidsWall posts list.
 * Always visible, with items-per-page selector and range summary.
 */
const KidsWallPagination = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pagination, filters, updateFilters, fetchPosts } = useKidsWall();

  if (!pagination) {
    return null;
  }

  const handlePageChange = (event, newPage) => {
    const newFilters = { ...filters, page: newPage };
    updateFilters(newFilters);
    
    // Update URL
    const params = new URLSearchParams(searchParams);
    if (newPage > 1) {
      params.set('page', String(newPage));
    } else {
      params.delete('page');
    }
    setSearchParams(params);
    
    fetchPosts(newFilters);
  };

  const handleLimitChange = (event) => {
    const newFilters = {
      ...filters,
      page: 1,
      limit: parseInt(event.target.value, 10),
    };
    updateFilters(newFilters);
    
    // Update URL
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    if (event.target.value !== '5') {
      params.set('limit', String(event.target.value));
    } else {
      params.delete('limit');
    }
    setSearchParams(params);
    
    fetchPosts(newFilters);
  };

  const itemsPerPage = pagination.limit || 5;
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
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
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
        Showing {startItem} to {endItem} of {totalItems} {totalItems === 1 ? 'post' : 'posts'}
      </Typography>

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

export default KidsWallPagination;
