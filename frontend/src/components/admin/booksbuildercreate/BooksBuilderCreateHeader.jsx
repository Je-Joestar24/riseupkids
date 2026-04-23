import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack } from '@mui/icons-material';

const BooksBuilderCreateHeader = ({ onBack }) => {
  const theme = useTheme();

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
          <Typography
            variant="h4"
            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.75rem' } }}
          >
            Build Built-in Book
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 1, color: 'text.secondary', fontFamily: 'Quicksand, sans-serif' }}
          >
            Each content section is configured by page type. This is the non-modal builder screen.
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
