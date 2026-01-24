import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { themeColors } from '../../config/themeColors';
import useKidsWall from '../../hooks/kidsWallHook';
import ShareSomethingHeader from '../../components/child/shareSomething/ShareSomethingHeader';
import ShareSomethingPhoto from '../../components/child/shareSomething/ShareSomethingPhoto';
import ShareSomethingTitle from '../../components/child/shareSomething/ShareSomethingTitle';
import ShareSomethingDescription from '../../components/child/shareSomething/ShareSomethingDescription';
import ShareSomethingCta from '../../components/child/shareSomething/ShareSomethingCta';
import ShareSomethingFooter from '../../components/child/shareSomething/ShareSomethingFooter';

/**
 * ChildShareSomething Page
 * 
 * Page for children to share their work on KidsWall
 * Supports navigation from different origins (Explore or Wall)
 * After successful post, navigates back to origin or to Wall
 */
const ChildShareSomething = ({ childId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createPost, loading } = useKidsWall(childId);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Get navigation origin from location state
  const fromState = location.state?.from;
  const backPath = location.state?.backPath;

  const handlePhotoSelect = (file) => {
    setSelectedPhoto(file);
  };

  const handleTitleChange = (value) => {
    setTitle(value);
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);
  };

  const handleSubmit = async (formData) => {
    try {
      // Create post using the hook
      await createPost(
        {
          title: formData.title,
          content: formData.description,
        },
        formData.photo
      );

      // Navigate after successful post
      // If came from explore, go back to explore; otherwise go to wall
      setTimeout(() => {
        if (fromState === 'explore' && backPath) {
          navigate(backPath);
        } else {
          navigate(`/child/${childId}/wall`);
        }
      }, 1500); // Small delay to show success message
    } catch (error) {
      // Error is already handled by the hook (shows notification)
      console.error('Error creating post:', error);
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
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* Header */}
        <ShareSomethingHeader childId={childId} />

        {/* Photo Upload Section */}
        <ShareSomethingPhoto
          onPhotoSelect={handlePhotoSelect}
          selectedPhoto={selectedPhoto}
        />

        {/* Title Input Section */}
        <ShareSomethingTitle
          title={title}
          onTitleChange={handleTitleChange}
          maxLength={50}
        />

        {/* Description Input Section */}
        <ShareSomethingDescription
          description={description}
          onDescriptionChange={handleDescriptionChange}
          maxLength={150}
        />

        {/* CTA Section */}
        <ShareSomethingCta
          photo={selectedPhoto}
          title={title}
          description={description}
          onSubmit={handleSubmit}
          loading={loading}
        />

        <ShareSomethingFooter/>
      </Box>
    </Box>
  );
};

export default ChildShareSomething;
