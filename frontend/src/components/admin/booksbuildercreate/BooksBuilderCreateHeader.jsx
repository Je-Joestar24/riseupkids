import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack } from '@mui/icons-material';
import {
  getCmsBookStatusChipColor,
  getCmsBookStatusLabel,
  normalizeBookStatus,
} from '../../../services/cmsBookAdminService';

const BooksBuilderCreateHeader = ({ onBack, status = 'draft', isEditMode = false }) => {
  const theme = useTheme();
  const normalizedStatus = normalizeBookStatus(status);
  const statusLabel = getCmsBookStatusLabel(normalizedStatus);
  const statusColor = getCmsBookStatusChipColor(normalizedStatus);

  return (
    <Paper
      sx={{
        p: 3,
        mb: 2,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography
              variant="h4"
              sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.75rem' } }}
            >
              {isEditMode ? 'Edit Built-in Book' : 'Build Built-in Book'}
            </Typography>
            <Chip
              label={statusLabel}
              color={statusColor}
              size="small"
              aria-label={`Book status: ${statusLabel}`}
              sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
            />
          </Stack>
          <Typography
            variant="body2"
            sx={{ mt: 1, color: 'text.secondary', fontFamily: 'Quicksand, sans-serif' }}
          >
            Save as draft while you work, then publish when every page is complete and valid.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={onBack}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
        >
          Back to List
        </Button>
      </Stack>
    </Paper>
  );
};

export default BooksBuilderCreateHeader;
