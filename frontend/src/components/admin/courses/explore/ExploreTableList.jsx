import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Avatar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  BookOutlined as BookOutlinedIcon,
  AssignmentOutlined as AssignmentOutlinedIcon,
} from '@mui/icons-material';
import { useExplore } from '../../../../hooks/exploreHook';
import ExploreEditModal from './ExploreEditModa';

/**
 * ExploreTableList Component
 *
 * Displays explore content in a table format with actions menu
 */
const ExploreTableList = () => {
  const theme = useTheme();
  const {
    exploreContent,
    loading,
    error,
    filters,
    deleteExploreContentData,
    fetchExploreContent,
    getContentTypeLabel,
    getVideoTypeLabel,
    getCoverImageUrl,
  } = useExplore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState(null);

  const handleMenuOpen = (event, content) => {
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
    // Refresh list
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
        // Refresh list
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <PlayArrowIcon />;
      case 'book':
        return <BookOutlinedIcon />;
      case 'activity':
      case 'activity_group':
        return <AssignmentOutlinedIcon />;
      default:
        return <AssignmentOutlinedIcon />;
    }
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
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '12px',
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
          position: 'relative',
        }}
      >
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
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: theme.palette.custom.bgSecondary,
              }}
            >
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Cover
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Title
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Type
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Video Type
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Category
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Stars
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Status
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
                align="right"
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exploreContent.map((content) => (
              <TableRow
                key={content._id}
                sx={{
                  '&:hover': {
                    backgroundColor: theme.palette.custom.bgTertiary,
                  },
                }}
              >
                <TableCell>
                  {content.coverImage ? (
                    <Avatar
                      src={getCoverImageUrl(content.coverImage)}
                      alt={content.title}
                      variant="rounded"
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '8px',
                      }}
                    />
                  ) : (
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '8px',
                        backgroundColor: theme.palette.custom.bgSecondary,
                        color: theme.palette.orange.main,
                      }}
                    >
                      {getTypeIcon(content.type)}
                    </Avatar>
                  )}
                </TableCell>
                <TableCell>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: theme.palette.text.primary,
                    }}
                  >
                    {content.title}
                  </Typography>
                  {content.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        fontSize: '0.8125rem',
                        marginTop: 0.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {content.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getContentTypeLabel(content.type)}
                    size="small"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>
                  {content.type === 'video' && content.videoType ? (
                    <Chip
                      label={getVideoTypeLabel(content.videoType)}
                      size="small"
                      color={content.videoType === 'replay' ? 'primary' : 'secondary'}
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 500,
                      }}
                    />
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        fontSize: '0.8125rem',
                      }}
                    >
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {content.category ? (
                    <Typography
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontSize: '0.875rem',
                        color: theme.palette.text.primary,
                      }}
                    >
                      {content.category}
                    </Typography>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        fontSize: '0.8125rem',
                      }}
                    >
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={`⭐ ${content.starsAwarded || 10}`}
                    size="small"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      backgroundColor: `${theme.palette.orange.main}20`,
                      color: theme.palette.orange.main,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={content.isPublished ? 'Published' : 'Draft'}
                      size="small"
                      color={content.isPublished ? 'success' : 'default'}
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 500,
                      }}
                    />
                    {content.isFeatured && (
                      <Chip
                        label="Featured"
                        size="small"
                        color="primary"
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 500,
                        }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, content)}
                    sx={{
                      color: theme.palette.text.secondary,
                      '&:hover': {
                        backgroundColor: theme.palette.custom.bgTertiary,
                      },
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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

export default ExploreTableList;
