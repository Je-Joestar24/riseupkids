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
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';
import ContentEditModal from './ContentEditModl';

/**
 * ContentItems Component
 *
 * Displays list of content items (currently activities/books/videos/audio)
 * Cards are perfect squares on top, no border radius, matching child-friendly layout.
 */
const ContentItems = ({ loading, onRefresh }) => {
  const theme = useTheme();
  const {
    contentItems,
    archiveContentData,
    restoreContentData,
    deleteContentData,
    filters,
  } = useContent();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState(null);
  const [selectedContentType, setSelectedContentType] = useState(CONTENT_TYPES.ACTIVITY);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleEdit = () => {
    if (selectedItem) {
      setSelectedContentId(selectedItem._id);
      setSelectedContentType(selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY);
      setEditModalOpen(true);
    }
    handleMenuClose();
  };

  const handleArchive = async () => {
    if (selectedItem) {
      try {
        const type = selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
        if (type === CONTENT_TYPES.ACTIVITY) {
          await archiveContentData(type, selectedItem._id);
        } else {
          await deleteContentData(type, selectedItem._id);
        }
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error archiving content:', error);
      }
    }
    handleMenuClose();
  };

  const handleRestore = async () => {
    if (selectedItem) {
      try {
        const type = selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
        if (type === CONTENT_TYPES.ACTIVITY) {
          await restoreContentData(type, selectedItem._id);
        }
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error restoring content:', error);
      }
    }
    handleMenuClose();
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedContentId(null);
    if (onRefresh) onRefresh();
  };

  const getTypeBadge = (item) => {
    const type = item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    switch (type) {
      case CONTENT_TYPES.BOOK:
        return '📚 Book';
      case CONTENT_TYPES.VIDEO:
        return '🎥 Video';
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return '🎤 Audio';
      case CONTENT_TYPES.ACTIVITY:
      default:
        return '⭐ Activity';
    }
  };

  const getStarsValue = (item) => {
    const type = item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    // Books use totalStarsAwarded, others use starsAwarded
    if (type === CONTENT_TYPES.BOOK) {
      return item.totalStarsAwarded || 0;
    }
    return item.starsAwarded || 0;
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
          No contents found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginTop: 1,
          }}
        >
          Create your first content item to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {contentItems.map((item) => (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={item._id}>
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
              onClick={(e) => handleMenuOpen(e, item)}
            >
              <MoreVertIcon />
            </IconButton>

            {/* Cover / Placeholder - full width square */}
            {item.coverImage ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '100%',
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${item.coverImage}`}
                  alt={item.title}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Type Badge - Upper left */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={getTypeBadge(item)}
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
                {/* Published/Draft Badge - Lower right */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={item.isPublished ? 'Published' : 'Draft'}
                    size="small"
                    sx={{
                      backgroundColor: item.isPublished
                        ? `${theme.palette.success.main}e0`
                        : `${theme.palette.grey[600]}e0`,
                      color: theme.palette.textCustom.inverse || theme.palette.common.white,
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                      backdropFilter: 'blur(4px)',
                    }}
                  />
                </Box>
                {/* Stars / SCORM badge - Lower left */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={`⭐ ${getStarsValue(item)}`}
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
                  paddingTop: '100%',
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
                {/* Type Badge - Upper left */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={getTypeBadge(item)}
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
                {/* Published/Draft Badge - Lower right */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={item.isPublished ? 'Published' : 'Draft'}
                    size="small"
                    sx={{
                      backgroundColor: item.isPublished
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
                  {item.title}
                </Typography>

                {/* Description */}
                {item.description && (
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
                    {item.description}
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
        <MenuItem
          onClick={handleEdit}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
          }}
        >
          <EditIcon sx={{ marginRight: 1, fontSize: 20 }} />
          Edit
        </MenuItem>
        {selectedItem?._contentType === CONTENT_TYPES.ACTIVITY && selectedItem?.isArchived ? (
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

      {/* Unified Edit Modal (currently activities only) */}
      <ContentEditModal
        open={editModalOpen}
        onClose={handleEditModalClose}
        contentId={selectedContentId}
        contentType={selectedContentType}
        onSuccess={handleEditModalClose}
      />
    </Grid>
  );
};

export default ContentItems;


