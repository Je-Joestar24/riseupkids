import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';

/**
 * YoutubePagination Component
 *
 * Page navigation: prev/next, page size, and "Page X of Y" / total count.
 */
const YoutubePagination = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  disabled,
}) => {
  const theme = useTheme();
  const orange = theme.palette.orange?.main || themeColors.orange;
  const border = theme.palette.border?.main || themeColors.border;

  const hasPrev = page > 1;
  const hasNext = page < totalPages && totalPages > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        padding: 2,
        borderTop: `1px solid ${border}`,
        backgroundColor: theme.palette.background.default,
        borderRadius: '0 0 12px 12px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          {total > 0
            ? `Page ${page} of ${totalPages} (${total} total)`
            : 'No results'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 72 }} disabled={disabled}>
          <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Per page</InputLabel>
          <Select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            label="Per page"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
            }}
          >
            <MenuItem value={5} sx={{ fontFamily: 'Quicksand, sans-serif' }}>5</MenuItem>
            <MenuItem value={10} sx={{ fontFamily: 'Quicksand, sans-serif' }}>10</MenuItem>
            <MenuItem value={20} sx={{ fontFamily: 'Quicksand, sans-serif' }}>20</MenuItem>
          </Select>
        </FormControl>
        <IconButton
          size="small"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !hasPrev}
          aria-label="Previous page"
          sx={{
            color: hasPrev ? orange : theme.palette.action.disabled,
            '&:hover': { backgroundColor: hasPrev ? `${orange}14` : undefined },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            minWidth: 24,
            textAlign: 'center',
          }}
        >
          {page}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !hasNext}
          aria-label="Next page"
          sx={{
            color: hasNext ? orange : theme.palette.action.disabled,
            '&:hover': { backgroundColor: hasNext ? `${orange}14` : undefined },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default YoutubePagination;
