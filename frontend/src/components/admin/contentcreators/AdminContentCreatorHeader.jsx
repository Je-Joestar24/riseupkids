import React from 'react';
import { Box, Typography, Paper, Stack, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';

/**
 * AdminContentCreatorHeader Component
 *
 * Header section for ContentCreators management page
 */
const AdminContentCreatorHeader = ({ onAddClick }) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        padding: 3.5,
        marginBottom: 4,
        marginTop: 2,
        borderRadius: '16px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
      }}
    >
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '1.75rem',
                color: theme.palette.text.primary,
              }}
            >
              Content Creators
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.9375rem',
                marginTop: 1,
              }}
            >
              Create and manage ContentCreator accounts. ContentCreators can manage courses/content but cannot manage users.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddClick}
            aria-label="Add ContentCreator"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: '0.875rem',
              padding: '10px 24px',
              borderRadius: '8px',
              textTransform: 'none',
              backgroundColor: theme.palette.orange.main,
              color: theme.palette.textCustom.inverse,
              '&:hover': {
                backgroundColor: theme.palette.orange.dark,
              },
            }}
          >
            Add ContentCreator
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default AdminContentCreatorHeader;

