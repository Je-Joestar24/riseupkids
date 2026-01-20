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
  Button,
  Chip,
  CircularProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import useKidsWall from '../../../hooks/kidsWallHook';
import KidsWallViewModal from './KidsWallViewModal';
import { formatDate } from '../../../util/helpers';

/**
 * KidsWallTableList Component
 *
 * Displays KidsWall posts in a table format with View, Approve, and Reject actions
 */
const KidsWallTableList = () => {
  const theme = useTheme();
  const {
    posts,
    loading,
    error,
    approvePostById,
    rejectPostById,
    fetchPosts,
  } = useKidsWall();

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [postToReject, setPostToReject] = useState(null);

  // Get image URL
  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.url && (image.url.startsWith('http://') || image.url.startsWith('https://'))) {
      return image.url;
    }
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const path = image.url || image.filePath;
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  };

  // Get avatar URL
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${avatar.startsWith('/') ? avatar : `/${avatar}`}`;
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return formatDate(dateString);
  };

  // Get status chip
  const getStatusChip = (isApproved) => {
    if (isApproved === true) {
      return (
        <Chip
          label="Approved"
          size="small"
          sx={{
            backgroundColor: theme.palette.success.light,
            color: theme.palette.success.dark,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
          }}
        />
      );
    } else if (isApproved === false) {
      return (
        <Chip
          label="Pending"
          size="small"
          sx={{
            backgroundColor: theme.palette.warning.light,
            color: theme.palette.warning.dark,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
          }}
        />
      );
    }
    return null;
  };

  const handleView = (post) => {
    setSelectedPost(post);
    setViewModalOpen(true);
  };

  const handleViewModalClose = () => {
    setViewModalOpen(false);
    setSelectedPost(null);
  };

  const handleApprove = async (postId) => {
    try {
      await approvePostById(postId);
      fetchPosts(); // Refresh list
    } catch (error) {
      console.error('Error approving post:', error);
    }
  };

  const handleRejectClick = (post) => {
    setPostToReject(post);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (postToReject) {
      try {
        await rejectPostById(postToReject._id);
        setRejectDialogOpen(false);
        setPostToReject(null);
        fetchPosts(); // Refresh list
      } catch (error) {
        console.error('Error rejecting post:', error);
      }
    }
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setPostToReject(null);
  };

  if (loading && posts.length === 0) {
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
          borderRadius: '12px',
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

  if (!loading && posts.length === 0) {
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
          No posts found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginTop: 1,
          }}
        >
          Try adjusting your filters
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
          backgroundColor: theme.palette.background.paper,
          overflow: 'hidden',
        }}
      >
        {loading && posts.length > 0 && (
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
                '& th': {
                  paddingTop: 3,
                  paddingBottom: 2,
                  borderBottom: `2px solid ${theme.palette.border.main}`,
                },
              }}
            >
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Image
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Child
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
                Content
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
              >
                Date
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
            {posts.map((post) => {
              const image = post.images?.[0];
              const imageUrl = image ? getImageUrl(image) : null;
              const child = post.child;
              const avatarUrl = child?.avatar ? getAvatarUrl(child.avatar) : null;

              return (
                <TableRow
                  key={post._id}
                  sx={{
                    '& td': {
                      padding: 2,
                      borderBottom: `1px solid ${theme.palette.border.main}`,
                      fontFamily: 'Quicksand, sans-serif',
                    },
                    '&:hover': {
                      backgroundColor: theme.palette.custom.bgTertiary,
                    },
                  }}
                >
                  <TableCell>
                    {imageUrl ? (
                      <Avatar
                        src={imageUrl}
                        alt={post.title}
                        variant="rounded"
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleView(post)}
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
                        <ImageIcon />
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {avatarUrl ? (
                        <Avatar
                          src={avatarUrl}
                          alt={child?.displayName}
                          sx={{ width: 32, height: 32 }}
                        />
                      ) : (
                        <Avatar sx={{ width: 32, height: 32, backgroundColor: theme.palette.primary.main }}>
                          {child?.displayName?.[0]?.toUpperCase() || '?'}
                        </Avatar>
                      )}
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 600,
                          }}
                        >
                          {child?.displayName || 'Unknown'}
                        </Typography>
                        {child?.age && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: 'Quicksand, sans-serif',
                              color: theme.palette.text.secondary,
                            }}
                          >
                            Age: {child.age}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 500,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {post.title || 'No title'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {post.content || 'No content'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(post.isApproved)}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {formatRelativeTime(post.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleView(post)}
                          sx={{
                            color: theme.palette.text.secondary,
                            '&:hover': {
                              backgroundColor: `${theme.palette.primary.main}20`,
                              color: theme.palette.primary.main,
                            },
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {post.isApproved === false && (
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            onClick={() => handleApprove(post._id)}
                            sx={{
                              color: theme.palette.text.secondary,
                              '&:hover': {
                                backgroundColor: `${theme.palette.success.main}20`,
                                color: theme.palette.success.main,
                              },
                            }}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(post.isApproved === false || post.isApproved === true) && (
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            onClick={() => handleRejectClick(post)}
                            sx={{
                              color: theme.palette.text.secondary,
                              '&:hover': {
                                backgroundColor: `${theme.palette.error.main}20`,
                                color: theme.palette.error.main,
                              },
                            }}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Modal */}
      <KidsWallViewModal
        open={viewModalOpen}
        onClose={handleViewModalClose}
        post={selectedPost}
        onApprove={handleApprove}
        onReject={handleRejectClick}
      />

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={handleRejectCancel}
        PaperProps={{
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
          Reject Post?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Are you sure you want to reject this post? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleRejectCancel}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default KidsWallTableList;
