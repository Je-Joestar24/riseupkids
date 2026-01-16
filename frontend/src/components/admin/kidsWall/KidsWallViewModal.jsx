import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Chip,
  Stack,
  Paper,
  Divider,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Favorite as FavoriteIcon,
  Star as StarIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { formatDate } from '../../../util/helpers';

/**
 * KidsWallViewModal Component
 *
 * Modal for viewing detailed KidsWall post information
 * - Full opacity (no low opacity)
 * - 0px border radius for image (perfect square)
 * - Rounded buttons
 */
const KidsWallViewModal = ({ open, onClose, post, onApprove, onReject }) => {
  const theme = useTheme();

  if (!post) return null;

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

  const image = post.images?.[0];
  const imageUrl = image ? getImageUrl(image) : null;
  const child = post.child;
  const avatarUrl = child?.avatar ? getAvatarUrl(child.avatar) : null;

  const likeCount = post.likes?.length || post.likeCount || 0;
  const starCount = post.stars?.length || post.starCount || 0;
  const commentCount = post.comments?.length || post.commentCount || 0;

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          fontFamily: 'Quicksand, sans-serif',
          // Full opacity - no low opacity
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `2px solid ${theme.palette.border.main}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '1.75rem',
              color: theme.palette.text.primary,
            }}
          >
            {post.title || 'Untitled Post'}
          </Typography>
          {getStatusChip(post.isApproved)}
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.custom.bgTertiary,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3}>
          {/* Child Information Card */}
          <Paper
            sx={{
              padding: 2,
              borderRadius: '12px',
              backgroundColor: theme.palette.custom.bgSecondary,
              border: `1px solid ${theme.palette.border.main}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {avatarUrl ? (
                <Avatar
                  src={avatarUrl}
                  alt={child?.displayName}
                  sx={{ width: 64, height: 64 }}
                />
              ) : (
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    backgroundColor: theme.palette.primary.main,
                  }}
                >
                  {child?.displayName?.[0]?.toUpperCase() || '?'}
                </Avatar>
              )}
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  {child?.displayName || 'Unknown Child'}
                </Typography>
                {child?.age && (
                  <Typography
                    variant="body2"
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
          </Paper>

          {/* Post Image - Perfect Square, 0px border radius */}
          {imageUrl && (
            <Box
              sx={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '0px', // 0px border radius - solid
                overflow: 'hidden',
                border: `1px solid ${theme.palette.border.main}`,
                backgroundColor: theme.palette.custom.bgSecondary,
              }}
            >
              <Box
                component="img"
                src={imageUrl}
                alt={post.title}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </Box>
          )}

          {/* Post Details */}
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  marginBottom: 0.5,
                }}
              >
                Title
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.primary,
                }}
              >
                {post.title || 'No title'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  marginBottom: 0.5,
                }}
              >
                Content
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.primary,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {post.content || 'No content'}
              </Typography>
            </Box>

            <Divider />

            {/* Post Metadata */}
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: theme.palette.text.secondary,
                  }}
                >
                  Created:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  {formatDate(post.createdAt)}
                </Typography>
              </Box>
              {post.isApproved && post.approvedAt && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    Approved:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    {formatDate(post.approvedAt)}
                  </Typography>
                </Box>
              )}
              {post.approvedBy && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    Approved by:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    {post.approvedBy?.name || 'Unknown'}
                  </Typography>
                </Box>
              )}
            </Stack>

            {/* Engagement Metrics */}
            {(likeCount > 0 || starCount > 0 || commentCount > 0) && (
              <>
                <Divider />
                <Box sx={{ display: 'flex', gap: 3 }}>
                  {likeCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FavoriteIcon
                        sx={{
                          fontSize: 20,
                          color: theme.palette.error.main,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                      </Typography>
                    </Box>
                  )}
                  {starCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StarIcon
                        sx={{
                          fontSize: 20,
                          color: theme.palette.warning.main,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {starCount} {starCount === 1 ? 'star' : 'stars'}
                      </Typography>
                    </Box>
                  )}
                  {commentCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CommentIcon
                        sx={{
                          fontSize: 20,
                          color: theme.palette.text.secondary,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `2px solid ${theme.palette.border.main}`,
          gap: 1,
        }}
      >
        {post.isApproved === false && (
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => {
              onApprove(post._id);
              onClose();
            }}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              backgroundColor: theme.palette.success.main,
              color: 'white',
              borderRadius: '12px', // Rounded buttons
              textTransform: 'none',
              paddingX: 3,
              paddingY: 1,
              '&:hover': {
                backgroundColor: theme.palette.success.dark,
              },
            }}
          >
            Approve
          </Button>
        )}
        {(post.isApproved === false || post.isApproved === true) && (
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={() => {
              onReject(post);
              onClose();
            }}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              backgroundColor: theme.palette.error.main,
              color: 'white',
              borderRadius: '12px', // Rounded buttons
              textTransform: 'none',
              paddingX: 3,
              paddingY: 1,
              '&:hover': {
                backgroundColor: theme.palette.error.dark,
              },
            }}
          >
            Reject
          </Button>
        )}
        <Button
          onClick={onClose}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            borderRadius: '12px', // Rounded buttons
            textTransform: 'none',
            paddingX: 3,
            paddingY: 1,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KidsWallViewModal;
