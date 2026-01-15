import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
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
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useExplore } from '../../../../hooks/exploreHook';
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
    getActivityIconUrl,
  } = useExplore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState(null);

  const handleMenuOpen = (event, content) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedContent(content);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContent(null);
  };

  const handleEdit = () => {
    if (selectedContent) {
      setContentToEdit(selectedContent);
      setEditModalOpen(true);
    }
    handleMenuClose();
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setContentToEdit(null);
    fetchExploreContent();
  };

  const handleDeleteClick = () => {
    setContentToDelete(selectedContent);
    setDeleteDialogOpen(true);
    handleMenuClose();
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

  // Render Replay Card (smaller format)
  const renderReplayCard = (content) => {
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
        }}
      >
        {/* Cover Image with Play Button Overlay */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio
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
          
          {/* Play Button Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'translate(-50%, -50%) scale(1.1)',
              },
            }}
          >
            <PlayArrowIcon
              sx={{
                fontSize: 28,
                color: theme.palette.orange.main,
                marginLeft: 0.5,
              }}
            />
          </Box>

          {/* Duration Badge */}
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

          {/* Actions Menu */}
          <IconButton
            onClick={(e) => handleMenuOpen(e, content)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            }}
            size="small"
          >
            <MoreVertIcon />
          </IconButton>
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

          {/* Creator (if available) */}
          {content.createdBy?.name && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.8125rem',
                marginBottom: 1,
              }}
            >
              by {content.createdBy.name}
            </Typography>
          )}

          {/* View Count */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              marginTop: 'auto',
            }}
          >
            <VisibilityIcon
              sx={{
                fontSize: 16,
                color: theme.palette.text.secondary,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.8125rem',
              }}
            >
              {formatViewCount(content.viewCount || 0)} views
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render Activity Card (purely video lesson - different layout)
  const renderActivityCard = (content) => {
    const activityIconUrl = content.activityIcon ? getActivityIconUrl(content.activityIcon) : null;
    const coverImageUrl = content.coverImage ? getCoverImageUrl(content.coverImage) : null;
    
    return (
      <Card
        key={content._id}
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0, // 0px solid radius for purely video cards
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
        <CardContent
          sx={{
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            flexGrow: 1,
          }}
        >
          {/* Row 1: SVG Icon on Left, Star Badge on Upper Right */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              position: 'relative',
            }}
          >
            {/* SVG Icon on Left (64px) */}
            <Box
              sx={{
                width: 64,
                height: 64,
                minWidth: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                flexShrink: 0,
              }}
            >
              {activityIconUrl ? (
                <Box
                  component="img"
                  src={activityIconUrl}
                  alt={content.title}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: 'transparent',
                  }}
                />
              ) : coverImageUrl ? (
                <Box
                  component="img"
                  src={coverImageUrl}
                  alt={content.title}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: 'transparent',
                  }}
                />
              ) : (
                <PlayArrowIcon
                  sx={{
                    fontSize: 40,
                    color: theme.palette.orange.main,
                  }}
                />
              )}
            </Box>

            {/* Star Badge on Upper Right */}
            <Box
              sx={{
                backgroundColor: '#f2af10',
                borderRadius: '9999px', // rounded-full
                paddingY: 0.75, // 6px (py-1.5 = 0.375rem * 2 = 0.75rem)
                paddingX: 1.5, // 12px (px-3 = 0.75rem * 2 = 1.5rem)
                display: 'flex',
                alignItems: 'center',
                gap: 0.5, // gap-1
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
                  fontSize: '1.125rem', // text-lg
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {content.starsAwarded || 10}
              </Typography>
            </Box>
          </Box>

          {/* Row 2: Title (reduced font size) */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '18px', // Reduced from 24px
              color: theme.palette.secondary?.main || theme.palette.text.primary, // Secondary color
              marginTop: 0.5,
              marginBottom: 0.5,
            }}
          >
            {content.title}
          </Typography>

          {/* Description below title */}
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

          {/* Row 3: Edit and Delete Buttons (Bottom Right) */}
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

  // Separate content by videoType
  const replayContent = exploreContent.filter((content) => content.videoType === 'replay');
  const activityContent = exploreContent.filter((content) => content.videoType === 'activity');

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

        {/* Replay Cards Section */}
        {replayContent.length > 0 && (
          <Box sx={{ marginBottom: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '1.5rem',
                color: theme.palette.text.primary,
                marginBottom: 2,
              }}
            >
              Replay Videos
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
                gap: 2,
              }}
            >
              {replayContent.map((content) => (
                <Box key={content._id}>
                  {renderReplayCard(content)}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Activity Cards Section (Purely Video Lesson - Different layout) - Perfect Square */}
        {activityContent.length > 0 && (
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: '1.5rem',
                color: theme.palette.text.primary,
                marginBottom: 2,
              }}
            >
              Purely Video Lessons
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
                gap: 2,
              }}
            >
              {activityContent.map((content) => (
                <Box 
                  key={content._id}
                  sx={{
                    aspectRatio: '1 / 1', // Perfect square
                  }}
                >
                  {renderActivityCard(content)}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            fontFamily: 'Quicksand, sans-serif',
            minWidth: 150,
          },
        }}
      >
        <MenuItem
          onClick={handleEdit}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
          }}
        >
          <EditIcon sx={{ marginRight: 1, fontSize: 20 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.error.main,
          }}
        >
          <DeleteIcon sx={{ marginRight: 1, fontSize: 20 }} />
          Delete
        </MenuItem>
      </Menu>

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
