import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useKidsWall from '../../../hooks/kidsWallHook';

/**
 * KidsWallHeader Component
 *
 * Header section for KidsWall posts page with title and stats
 */
const KidsWallHeader = () => {
  const theme = useTheme();
  const { pagination } = useKidsWall();

  return (
    <Paper
      sx={{
        padding: 3.5,
        marginBottom: 3,
        marginTop: 2,
        borderRadius: '16px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
      }}
    >
      <Stack spacing={1}>
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
            KidsWall Posts
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              marginTop: 0.5,
            }}
          >
            Manage and moderate posts from children
          </Typography>
        </Box>
        {pagination && (
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
            }}
          >
            Total: {pagination.total} {pagination.total === 1 ? 'post' : 'posts'}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default KidsWallHeader;
