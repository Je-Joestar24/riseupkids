import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Description as DescriptionIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';
import { BACKEND_BASE_URL } from '../../../../config/constants';
import ActivityEditModal from './ActivityEditModal';
import { showConfirmationDialog } from '../../../../store/slices/uiSlice';

/**
 * ActivityItems Component
 * 
 * Displays list of activities
 */
const ActivityItems = ({ loading, onRefresh }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    contentItems,
    archiveContentData,
    restoreContentData,
    deleteContentData,
    filters,
  } = useContent();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const handleMenuOpen = (event, activity) => {
    setAnchorEl(event.currentTarget);
    setSelectedActivity(activity);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedActivity(null);
  };

  const handleEdit = () => {
    if (selectedActivity) {
      setSelectedActivityId(selectedActivity._id);
      setEditModalOpen(true);
    }
    handleMenuClose();
  };

  const handleArchive = async () => {
    if (selectedActivity) {
      try {
        const type = selectedActivity._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
        if (type === CONTENT_TYPES.ACTIVITY) {
          await archiveContentData(type, selectedActivity._id);
        } else {
          await deleteContentData(type, selectedActivity._id);
        }
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error archiving activity:', error);
      }
    }
    handleMenuClose();
  };

  const handleArchiveWithConfirm = () => {
    if (!selectedActivity) return;
    const activity = selectedActivity;
    const type = activity._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    handleMenuClose();
    dispatch(
      showConfirmationDialog({
        title: 'Archive Content?',
        message: `Are you sure you want to archive "${activity.title || 'this content'}"? You can restore it later.`,
        type: 'warning',
        confirmText: 'Archive',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            if (type === CONTENT_TYPES.ACTIVITY || type === CONTENT_TYPES.BOOK) {
              await archiveContentData(type, activity._id);
            }
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error('Error archiving activity:', error);
          }
        },
      })
    );
  };

  const handleDeleteWithConfirm = () => {
    if (!selectedActivity) return;
    const activity = selectedActivity;
    const type = activity._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    handleMenuClose();
    dispatch(
      showConfirmationDialog({
        title: 'Delete Permanently?',
        message: `This will permanently delete "${activity.title || 'this content'}" and cannot be undone. Continue?`,
        type: 'error',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            await deleteContentData(type, activity._id);
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error('Error deleting content permanently:', error);
          }
        },
      })
    );
  };

  const handleRestore = async () => {
    if (selectedActivity) {
      try {
        const type = selectedActivity._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
        if (type === CONTENT_TYPES.ACTIVITY) {
          await restoreContentData(type, selectedActivity._id);
        }
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error restoring activity:', error);
      }
    }
    handleMenuClose();
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedActivityId(null);
    if (onRefresh) {
      onRefresh();
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!contentItems || contentItems.length === 0) {
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
          No activities found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginTop: 1,
          }}
        >
          Create your first activity to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {contentItems.map((activity) => (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={activity._id}>
          <Card
            sx={{
              borderRadius: '0px',
              border: `1px solid ${theme.palette.border.main}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                boxShadow: theme.shadows[4],
                transform: 'translateY(-4px)',
              },
            }}
          >
            {/* Action Menu Button */}
            <IconButton
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                backgroundColor: theme.palette.background.paper,
                opacity: 0.9,
                '&:hover': {
                  backgroundColor: theme.palette.custom.bgTertiary,
                  opacity: 1,
                },
              }}
              onClick={(e) => handleMenuOpen(e, activity)}
            >
              <MoreVertIcon />
            </IconButton>

            {/* Cover Image - Full width, perfect square, no padding */}
            {activity.coverImage ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '100%', // Creates perfect square (1:1 aspect ratio)
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={`${BACKEND_BASE_URL}${activity.coverImage}`}
                  alt={activity.title}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Stars Badge - Upper left corner */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={`⭐ ${activity.starsAwarded || 15}`}
                    size="small"
                    sx={{
                      backgroundColor: `${theme.palette.orange.main}e0`,
                      color: theme.palette.textCustom.inverse || theme.palette.common.white,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                </Box>
                {/* Published/Draft Badge - Lower right corner */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={activity.isPublished ? 'Published' : 'Draft'}
                    size="small"
                    sx={{
                      backgroundColor: activity.isPublished
                        ? `${theme.palette.success.main}e0`
                        : `${theme.palette.grey[600]}e0`,
                      color: theme.palette.textCustom.inverse || theme.palette.common.white,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                </Box>
                {/* SCORM Badge - Lower left corner */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label="SCORM"
                    size="small"
                    sx={{
                      backgroundColor: `${theme.palette.primary.main}e0`,
                      color: theme.palette.textCustom.inverse || theme.palette.common.white,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  paddingTop: '100%', // Creates perfect square
                  position: 'relative',
                  backgroundColor: theme.palette.custom.bgSecondary || theme.palette.grey[100],
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 48, color: theme.palette.orange.main }} />
                </Box>
                {/* Stars Badge - Upper left corner (for no cover image) */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={`⭐ ${activity.starsAwarded || 15}`}
                    size="small"
                    sx={{
                      backgroundColor: `${theme.palette.orange.main}e0`,
                      color: theme.palette.textCustom.inverse || theme.palette.common.white,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                </Box>
                {/* Published/Draft Badge - Lower right corner (for no cover image) */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={activity.isPublished ? 'Published' : 'Draft'}
                    size="small"
                    sx={{
                      backgroundColor: activity.isPublished
                        ? `${theme.palette.success.main}e0`
                        : `${theme.palette.grey[600]}e0`,
                      color: theme.palette.textCustom.inverse || theme.palette.common.white,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                </Box>
              </Box>
            )}

            <CardContent sx={{ flexGrow: 1, padding: 2.5 }}>
              <Stack spacing={2}>

                {/* Title */}
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    fontSize: '1.125rem',
                    color: theme.palette.text.primary,
                    lineHeight: 1.4,
                  }}
                >
                  {activity.title}
                </Typography>

                {/* Description */}
                {activity.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.secondary,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {activity.description}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

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
        {!selectedActivity?.isArchived && (
          <MenuItem
            onClick={handleEdit}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            <EditIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Edit
          </MenuItem>
        )}
        {selectedActivity?.isArchived ? (
          <>
            <MenuItem
              onClick={handleRestore}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.success.main,
              }}
            >
              <RestoreIcon sx={{ marginRight: 1, fontSize: 20 }} />
              Restore
            </MenuItem>
            <MenuItem
              onClick={handleDeleteWithConfirm}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.error.main,
              }}
            >
              <DeleteForeverIcon sx={{ marginRight: 1, fontSize: 20 }} />
              Delete Permanently
            </MenuItem>
          </>
        ) : (
          <MenuItem
            onClick={handleArchiveWithConfirm}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.warning.main,
            }}
          >
            <ArchiveIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Archive
          </MenuItem>
        )}
      </Menu>

      {/* Edit Modal */}
      <ActivityEditModal
        open={editModalOpen}
        onClose={handleEditModalClose}
        activityId={selectedActivityId}
        onSuccess={handleEditModalClose}
      />
    </Grid>
  );
};

export default ActivityItems;

