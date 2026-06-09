import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack, Description } from '@mui/icons-material';

const PrintablesHeader = ({ selectedCourse, totalModules = 0, onBackToTable }) => {
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
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description sx={{ color: theme.palette.orange.main }} />
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.35rem', md: '1.75rem' },
              }}
            >
              Program Printables
            </Typography>
          </Box>
          {selectedCourse ? (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={onBackToTable}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
              }}
            >
              Back to Table
            </Button>
          ) : null}
        </Box>

        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          {selectedCourse
            ? `Viewing printable materials for "${selectedCourse.title}"${selectedCourse.isPublished === false ? ' (draft module)' : ''}.`
            : `Manage printable materials per module, including drafts before publishing. Total modules: ${totalModules}.`}
        </Typography>
      </Stack>
    </Paper>
  );
};

export default PrintablesHeader;

