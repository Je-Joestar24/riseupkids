import React from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * Heart Icon Component (Custom SVG)
 */
const HeartIcon = ({ isLiked, size = 16 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={isLiked ? themeColors.orange : 'none'}
    stroke={isLiked ? themeColors.orange : 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"></path>
  </svg>
);

/**
 * Star Icon Component (Custom SVG)
 */
const StarIcon = ({ isStarred, size = 16 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={isStarred ? themeColors.accent : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
  </svg>
);

/**
 * KidsWallCards Component
 * 
 * Displays posts in a card grid layout
 */
const KidsWallCards = ({ posts = [], onDelete, onToggleLike, onToggleStar, currentChildId }) => {
  // List of random emojis for child avatars
  const emojiList = ['🎨', '🎭', '🎪', '🎯', '🎲', '🎮', '🎸', '🎺', '🎻', '🎤', '🎧', '🎬', '🎥', '📷', '📸', '🎞️', '🎨', '🖌️', '🖍️', '✏️', '✒️', '🖊️', '🖋️', '📝', '💡', '🔍', '🔎', '📚', '📖', '📗', '📘', '📙', '📕', '📓', '📒', '📃', '📄', '📑', '🔖', '🏷️', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💹', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳️', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📝', '💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️'];

  // Get emoji for a post (consistent based on post ID)
  const getEmojiForPost = (postId) => {
    if (!postId) return emojiList[0];
    // Use post ID to consistently select an emoji
    const index = postId.toString().split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % emojiList.length;
    return emojiList[index];
  };

  // Get image URL
  const getImageUrl = (image) => {
    if (!image) return null;

    // If already a full URL, return as-is
    if (image.url && (image.url.startsWith('http://') || image.url.startsWith('https://'))) {
      return image.url;
    }

    // Build full URL from relative path
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const path = image.url || image.filePath;
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  };

  // Get like count
  const getLikeCount = (post) => {
    return post.likes?.length || post.likeCount || 0;
  };

  // Check if current child has liked the post
  const isLikedByCurrentChild = (post) => {
    if (!currentChildId || !post.likes) return false;
    return post.likes.some((like) => like.child?._id?.toString() === currentChildId.toString());
  };

  // Check if current child has starred the post
  const isStarredByCurrentChild = (post) => {
    if (!currentChildId || !post.stars) return false;
    return post.stars.some((star) => star.child?._id?.toString() === currentChildId.toString());
  };

  // Handle like toggle
  const handleLike = async (postId) => {
    if (onToggleLike) {
      try {
        await onToggleLike(postId);
      } catch (err) {
        console.error('Error toggling like:', err);
      }
    }
  };

  // Handle star toggle
  const handleStar = async (postId) => {
    if (onToggleStar) {
      try {
        await onToggleStar(postId);
      } catch (err) {
        console.error('Error toggling star:', err);
      }
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(2, 1fr)',
        },
        gap: '24px',
        marginBottom: '32px',
      }}
    >
      {posts.map((post) => {
        const image = post.images?.[0];
        const imageUrl = image ? getImageUrl(image) : null;
        const child = post.child || {};
        const childName = child.displayName || 'Child';
        const childAge = child.age || null;
        const emoji = getEmojiForPost(post._id);
        const likeCount = getLikeCount(post);
        const isLiked = isLikedByCurrentChild(post);
        const isStarred = isStarredByCurrentChild(post);

        return (
          <Box
            key={post._id}
            sx={{
              backgroundColor: themeColors.bgCard,
              borderRadius: '0px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* First Row: Image (Perfect Square) */}
            {imageUrl && (
              <Box
                sx={{
                  width: '100%',
                  paddingTop: '100%', // Perfect square (1:1 aspect ratio)
                  position: 'relative',
                  backgroundColor: themeColors.bgSecondary,
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={imageUrl}
                  alt={post.title || 'Post image'}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Box>
            )}

            {/* Second Row: Details and Interactions */}
            <Box sx={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
              {/* First Row: Name and Age */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                {/* Emoji Avatar */}
                <Box
                  sx={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgb(253, 232, 222)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  {emoji}
                </Box>

                {/* Name and Age */}
                <Box>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: themeColors.secondary,
                      lineHeight: 1.2,
                    }}
                  >
                    {childName}
                  </Typography>
                  {childAge && (
                    <Typography
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontSize: '12px',
                        color: 'oklch(0.551 0.027 264.364)',
                        lineHeight: 1.2,
                        fontWeight: 600
                      }}
                    >
                      Age {childAge}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Second Row: Title and Description */}
              <Box sx={{ marginBottom: '12px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '16px',
                    color: themeColors.secondary,
                    marginBottom: '8px',
                    lineHeight: 1.3,
                  }}
                >
                  {post.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '14px',
                    color: 'oklch(0.446 0.03 256.802)',
                    lineHeight: 1.5,
                  }}
                >
                  {post.content}
                </Typography>
              </Box>

              {/* Interactions: Heart and Star */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingTop: '8px',
                  borderTop: `1px solid ${themeColors.border}`,
                }}
              >
                {/* Heart Icon with Count */}
                <Box
                  component="button"
                  onClick={() => handleLike(post._id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: isLiked ? themeColors.orange : 'rgb(107, 114, 128)',
                    padding: '4px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '14px',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s',
                  }}
                  aria-label="Like"
                >
                  <HeartIcon isLiked={isLiked} size={16} />
                  <span>{likeCount}</span>
                </Box>

                {/* Star Icon with "Great!" */}
                <Button
                  onClick={() => handleStar(post._id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: isStarred ? themeColors.accent : themeColors.bgTertiary,
                    color: isStarred ? themeColors.textInverse : 'rgb(107, 114, 128)',
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '14px',
                    textTransform: 'none',
                    borderRadius: '4px',
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: isStarred ? themeColors.accent : themeColors.border,
                    },
                    transition: 'all 0.2s',
                  }}
                  aria-label="Star"
                >
                  <StarIcon isStarred={isStarred} size={16} />
                  <span>Great!</span>
                </Button>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default KidsWallCards;
