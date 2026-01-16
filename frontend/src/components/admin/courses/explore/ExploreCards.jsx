import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useExplore } from '../../../../hooks/exploreHook';
import { getVideoTypeOptions } from '../../../../constants/exploreVideoTypes';
import ExploreEditModal from './ExploreEditModa';

/**
 * ExploreCards Component
 *
 * Displays explore content in card format
 * - Smaller cards for replay type videos
 * - Different layout for activity (purely video lesson) type - image smaller on upper left
 * - View counts shown on left side for replay type
 */
const ExploreCards = () => {
  const theme = useTheme();
  const {
    exploreContent,
    loading,
    error,
    filters,
    deleteExploreContentData,
    fetchExploreContent,
    getCoverImageUrl,
  } = useExplore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState(null);

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setContentToEdit(null);
    fetchExploreContent();
  };

  const handleDeleteConfirm = async () => {
    if (contentToDelete) {
      try {
        await deleteExploreContentData(contentToDelete._id);
        setDeleteDialogOpen(false);
        setContentToDelete(null);
        fetchExploreContent();
      } catch (error) {
        console.error('Error deleting explore content:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setContentToDelete(null);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min${secs > 0 ? ` ${secs}s` : ''}`;
  };

  const formatViewCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Render unified card for all video types
  const renderCard = (content) => {
    const coverImageUrl = content.coverImage ? getCoverImageUrl(content.coverImage) : null;
    
    return (
      <Card
        key={content._id}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '0px',
          overflow: 'hidden',
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: theme.shadows[6],
            transform: 'translateY(-4px)',
          },
          position: 'relative',
          backgroundColor: 'white',
        }}
      >
        {/* Cover Image - Rectangular */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio (rectangular)
            backgroundColor: theme.palette.custom.bgSecondary,
            overflow: 'hidden',
          }}
        >
          {coverImageUrl ? (
            <Box
              component="img"
              src={coverImageUrl}
              alt={content.title}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.palette.custom.bgSecondary,
              }}
            >
              <PlayArrowIcon
                sx={{
                  fontSize: 48,
                  color: theme.palette.orange.main,
                }}
              />
            </Box>
          )}

          {/* Duration Badge (if available) */}
          {content.duration && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {formatDuration(content.duration)}
            </Box>
          )}

          {/* Star Badge (for non-replay types) */}
          {content.videoType !== 'replay' && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: '#f2af10',
                borderRadius: '9999px',
                paddingY: 0.75,
                paddingX: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                boxShadow: theme.shadows[2],
              }}
            >
              <StarIcon
                sx={{
                  width: 20,
                  height: 20,
                  color: 'white',
                  fill: 'white',
                }}
              />
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {content.starsAwarded || 10}
              </Typography>
            </Box>
          )}

          {/* View Count (for replay type) */}
          {content.videoType === 'replay' && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <VisibilityIcon sx={{ fontSize: 14 }} />
              {formatViewCount(content.viewCount || 0)}
            </Box>
          )}
        </Box>

        {/* Content Details */}
        <CardContent
          sx={{
            flexGrow: 1,
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
          }}
        >
          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              color: theme.palette.text.primary,
              marginBottom: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {content.title}
          </Typography>

          {/* Description */}
          {content.description && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                marginBottom: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.4,
              }}
            >
              {content.description}
            </Typography>
          )}

          {/* Action Buttons at Bottom */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 0.5,
              marginTop: 'auto',
              paddingTop: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setContentToEdit(content);
                setEditModalOpen(true);
              }}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                border: `1px solid ${theme.palette.primary.main}`,
                '&:hover': {
                  borderColor: theme.palette.primary.dark,
                  backgroundColor: `${theme.palette.primary.main}10`,
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setContentToDelete(content);
                setDeleteDialogOpen(true);
              }}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                borderColor: theme.palette.error.main,
                color: theme.palette.error.main,
                border: `1px solid ${theme.palette.error.main}`,
                '&:hover': {
                  borderColor: theme.palette.error.dark,
                  backgroundColor: `${theme.palette.error.main}10`,
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading && exploreContent.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper
        sx={{
          padding: 2,
          marginBottom: 2,
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.contrastText,
          borderRadius: '8px',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
          }}
        >
          Error: {error}
        </Typography>
      </Paper>
    );
  }

  if (!loading && exploreContent.length === 0) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          No explore content found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginTop: 1,
          }}
        >
          {filters?.search || filters?.type || filters?.isPublished !== undefined
            ? 'Try adjusting your filters'
            : 'Create your first explore content to get started'}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        {loading && exploreContent.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
              borderRadius: '12px',
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Unified Cards Grid - All video types together */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(5, 1fr)', // 5 cards per row on large screens
            },
            gap: 2,
          }}
        >
          {exploreContent.map((content) => renderCard(content))}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: '12px',
            fontFamily: 'Quicksand, sans-serif',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
          }}
        >
          Delete Explore Content?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Are you sure you want to delete "{contentToDelete?.title}"? This action cannot be undone
            and will permanently delete the content and all associated files.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <ExploreEditModal
        open={editModalOpen}
        onClose={handleEditModalClose}
        contentId={contentToEdit?._id}
        onSuccess={handleEditModalClose}
      />
    </>
  );
};

export default ExploreCards;
