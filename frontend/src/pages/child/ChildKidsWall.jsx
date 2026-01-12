import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { themeColors } from '../../config/themeColors';
import useKidsWall from '../../hooks/kidsWallHook';
import KidsWallHeader from '../../components/child/kidswall/KidsWallHeader';
import KidsWallShareSomething from '../../components/child/kidswall/KidsWallShareSomething';
import KidsWallCards from '../../components/child/kidswall/KidsWallCards';
import KidsWallFooter from '../../components/child/kidswall/KidsWallFooter';

/**
 * ChildKidsWall Page
 * 
 * KidsWall page for child interface
 * Displays form to share posts and list of all posts
 */
const ChildKidsWall = ({ childId }) => {
  const {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    deletePost,
  } = useKidsWall(childId);

  // Fetch posts on mount (feed - all posts)
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle post creation
  const handleCreatePost = async (postData, imageFile) => {
    try {
      await createPost(postData, imageFile);
    } catch (err) {
      console.error('Error creating post:', err);
    }
  };

  // Handle post deletion
  const handleDeletePost = async (postId) => {
    try {
      await deletePost(postId);
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'rgb(244, 237, 216)',
        paddingBottom: '90px', // Space for fixed bottom navigation
        paddingTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: '848px',
          width: '100%',
          margin: '0 auto',
          padding: { xs: '16px', sm: '32px' },
        }}
      >
        {/* Header */}
        <KidsWallHeader />

        {/* Share Something Form */}
        <KidsWallShareSomething
          onSubmit={handleCreatePost}
          loading={loading}
        />

        {/* Loading State */}
        {loading && posts.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
            }}
          >
            <CircularProgress sx={{ color: themeColors.secondary }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box
            sx={{
              padding: '20px',
              marginTop: '24px',
              backgroundColor: themeColors.bgCard,
              borderRadius: '12px',
            }}
          >
            <Typography
              sx={{
                color: themeColors.error,
                fontSize: '1rem',
                textAlign: 'center',
              }}
            >
              {error}
            </Typography>
          </Box>
        )}

        {/* Posts List */}
        {!loading && posts.length > 0 && (
          <KidsWallCards
            posts={posts}
            onDelete={handleDeletePost}
          />
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && !error && (
          <Box
            sx={{
              padding: '40px',
              textAlign: 'center',
              marginTop: '24px',
            }}
          >
            <Typography
              sx={{
                color: themeColors.textSecondary,
                fontSize: '1.2rem',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              No posts yet. Share something to get started!
            </Typography>
          </Box>
        )}

        {/* Footer */}
        <KidsWallFooter />
      </Box>
    </Box>
  );
};

export default ChildKidsWall;
