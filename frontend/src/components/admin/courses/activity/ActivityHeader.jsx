import React from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import useActivity from '../../../../hooks/activityHook';

/**
 * ActivityHeader Component
 * 
 * Header section for activities page with title and add button
 */
const ActivityHeader = ({ onAddClick }) => {
  const theme = useTheme();
  const { activities, pagination } = useActivity();

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
              Activities
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                marginTop: 0.5,
              }}
            >
              Manage learning activities for children
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddClick}
            sx={{
              backgroundColor: theme.palette.orange.main,
              color: theme.palette.textCustom.inverse,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              paddingX: 3,
              paddingY: 1.5,
              borderRadius: '12px',
              textTransform: 'none',
              boxShadow: `0 4px 12px ${theme.palette.orange.main}40`,
              '&:hover': {
                backgroundColor: theme.palette.orange.dark,
                boxShadow: `0 6px 16px ${theme.palette.orange.main}60`,
              },
            }}
          >
            Add Activity
          </Button>
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
            Total: {pagination.total} activities
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default ActivityHeader;

