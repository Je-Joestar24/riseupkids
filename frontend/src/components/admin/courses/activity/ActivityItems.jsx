import React, { useState } from 'react';
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
} from '@mui/icons-material';
import useActivity from '../../../../hooks/activityHook';
import ActivityEditModal from './ActivityEditModal';

/**
 * ActivityItems Component
 * 
 * Displays list of activities
 */
const ActivityItems = ({ loading, onRefresh }) => {
  const theme = useTheme();
  const { activities, archiveActivityData, restoreActivityData } = useActivity();
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
        await archiveActivityData(selectedActivity._id);
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error archiving activity:', error);
      }
    }
    handleMenuClose();
  };

  const handleRestore = async () => {
    if (selectedActivity) {
      try {
        await restoreActivityData(selectedActivity._id);
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

  if (!activities || activities.length === 0) {
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
      {activities.map((activity) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={activity._id}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${theme.palette.border.main}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              position: 'relative',
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
                zIndex: 1,
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: theme.palette.custom.bgTertiary,
                },
              }}
              onClick={(e) => handleMenuOpen(e, activity)}
            >
              <MoreVertIcon />
            </IconButton>

            <CardContent sx={{ flexGrow: 1, padding: 2.5 }}>
              <Stack spacing={2}>
                {/* Cover Image or Icon */}
                {activity.coverImage ? (
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: 120,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${activity.coverImage}`}
                      alt={activity.title}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {/* SCORM Badge - Absolute positioned */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                      }}
                    >
                      <Chip
                        label="SCORM"
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.primary.main}20`,
                          color: theme.palette.primary.main,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 600,
                          backdropFilter: 'blur(4px)',
                        }}
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
                    <DescriptionIcon sx={{ fontSize: 48, color: theme.palette.orange.main }} />
                  </Box>
                )}

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

                {/* Stars and Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={`⭐ ${activity.starsAwarded || 15} stars`}
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.orange.light,
                      color: theme.palette.orange.dark,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={activity.isPublished ? 'Published' : 'Draft'}
                    size="small"
                    sx={{
                      backgroundColor: activity.isPublished
                        ? theme.palette.success.light
                        : theme.palette.grey[300],
                      color: activity.isPublished
                        ? theme.palette.success.dark
                        : theme.palette.grey[700],
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                    }}
                  />
                </Box>
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
        ) : (
          <MenuItem
            onClick={handleArchive}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.error.main,
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

