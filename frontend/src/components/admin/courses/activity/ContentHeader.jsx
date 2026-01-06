import React from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';

/**
 * ContentHeader Component
 *
 * Header section for unified contents page with title and add button
 */
const ContentHeader = ({ onAddClick }) => {
  const theme = useTheme();
  const { pagination, currentContentType } = useContent();

  const getTitle = () => {
    switch (currentContentType) {
      case CONTENT_TYPES.BOOK:
        return 'Books';
      case CONTENT_TYPES.VIDEO:
        return 'Videos';
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return 'Audio Assignments';
      case CONTENT_TYPES.ACTIVITY:
      default:
        return 'Activityy';
    }
  };

  const getSubtitle = () => {
    switch (currentContentType) {
      case CONTENT_TYPES.BOOK:
        return 'Manage interactive books and reading journeys';
      case CONTENT_TYPES.VIDEO:
        return 'Manage learning videos with SCORM interactions';
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return 'Manage audio assignments and speaking activities';
      case CONTENT_TYPES.ACTIVITY:
      default:
        return 'Manage interactive learning activities for children';
    }
  };

  const totalLabel = () => {
    switch (currentContentType) {
      case CONTENT_TYPES.BOOK:
        return 'books';
      case CONTENT_TYPES.VIDEO:
        return 'videos';
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return 'audio assignments';
      case CONTENT_TYPES.ACTIVITY:
      default:
        return 'activities';
    }
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
              {getTitle()}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                marginTop: 0.5,
              }}
            >
              {getSubtitle()}
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
            Add {getTitle().slice(0, -1)}
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
            Total: {pagination.total} {totalLabel()}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default ContentHeader;


