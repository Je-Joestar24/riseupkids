import React, { useState } from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import { useExplore } from '../../../../hooks/exploreHook';
import ExploreAddModal from './ExploreAddModal';

/**
 * ExploreHeader Component
 *
 * Header section for explore content page with title and add button
 */
const ExploreHeader = () => {
  const theme = useTheme();
  const { pagination, fetchExploreContent } = useExplore();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddClick = () => {
    setAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setAddModalOpen(false);
  };

  const handleAddSuccess = () => {
    setAddModalOpen(false);
    // Refresh explore content list
    fetchExploreContent();
  };

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
              Explore Content
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                marginTop: 0.5,
              }}
            >
              Manage explore content (Videos, Lessons, Activities) available in the Explore page
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
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
            Add Content
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
            Total: {pagination.total} {pagination.total === 1 ? 'item' : 'items'}
          </Typography>
        )}
      </Stack>
      
      {/* Add Modal */}
      <ExploreAddModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddSuccess}
      />
    </Paper>
  );
};

export default ExploreHeader;
