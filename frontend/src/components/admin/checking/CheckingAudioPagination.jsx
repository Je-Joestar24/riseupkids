import React from 'react';
import {
  Box,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * CheckingAudioPagination Component
 * 
 * Pagination and items per page controls
 */
const CheckingAudioPagination = ({
  pagination,
  onPageChange,
  onLimitChange,
}) => {
  const theme = useTheme();

  const {
    page = 1,
    limit = 10,
    total = 0,
    pages = 0,
  } = pagination;

  const handlePageChange = (event, value) => {
    onPageChange(value);
  };

  const handleLimitChange = (event) => {
    onLimitChange(event.target.value);
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

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
            value={limit || 10}
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
            <MenuItem value={25}>25</MenuItem>
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
        Showing {startItem} to {endItem} of {total} submissions
      </Typography>

      {/* Pagination Controls */}
      {pages > 1 && (
        <Pagination
          count={pages}
          page={page}
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
      )}
    </Box>
  );
};

export default CheckingAudioPagination;
