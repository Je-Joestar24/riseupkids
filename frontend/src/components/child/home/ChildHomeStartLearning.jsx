import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import sampleImage from '../../../assets/images/sample.png';
import { themeColors } from '../../../config/themeColors';
import { useNavigate, useParams } from 'react-router-dom';
import childrenService from '../../../services/childrenService';

/**
 * ChildHomeStartLearning Component
 * 
 * Welcome card component for child home page
 * Displays personalized greeting with avatar and start learning button
 * 
 * Uses API to fetch child data if not provided via props
 */
const ChildHomeStartLearning = ({ child: childProp }) => {
  const navigate = useNavigate();
  const { id: childId } = useParams();
  const [child, setChild] = useState(childProp);

  // Fetch child data from API if not provided via props
  useEffect(() => {
    // If we have a valid child prop, use it
    if (childProp && childProp._id) {
      setChild(childProp);
      return;
    }

    // Otherwise, fetch from API
    if (childId) {
      childrenService.getChildById(childId)
        .then((response) => {
          setChild(response.data || response);
        })
        .catch((err) => {
          console.error('[ChildHomeStartLearning] Error fetching child:', err);
        });
    }
  }, [childId, childProp]);

  // Update child when prop changes
  useEffect(() => {
    if (childProp && childProp._id) {
      setChild(childProp);
    }
  }, [childProp]);

  const handleStartLearning = () => {
    navigate(`/child/${childId}/explore`);
  };

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        padding: '32px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: `4px solid ${themeColors.orange}`, // --theme-orange: #e98a68
        borderRadius: '0px',
      }}
    >
      {/* Avatar and Greeting Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Avatar */}
        <Box
          sx={{
            width: '128px',
            height: '128px',
            borderRadius: '50%',
            backgroundColor: themeColors.primary, // --theme-primary: #62caca
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            flexShrink: 0,
          }}
        >
          <img
            src={sampleImage}
            alt="Child Avatar"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
        </Box>

        {/* Greeting Text */}
        <Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '36px',
              fontWeight: 600,
              color: themeColors.primary, // --theme-primary: #62caca
              marginBottom: '4px',
              lineHeight: 1.2,
            }}
          >
            Hi, {child ? child.displayName : 'Friend'}!
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '20px',
              color: themeColors.textSubheading,
              lineHeight: 1.4,
            }}
          >
            Ready to learn something awesome?
          </Typography>
        </Box>
      </Box>

      {/* Start Learning Button */}
      <Button
        onClick={handleStartLearning}
        fullWidth
        sx={{
          backgroundColor: themeColors.accent, // --theme-accent: #f2af10
          color: 'white',
          padding: '24px 32px',
          fontSize: '24px',
          fontWeight: 600,
          fontFamily: 'Quicksand, sans-serif',
          textTransform: 'none',
          borderRadius: '0px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#e09f00',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        <PlayArrowIcon
          sx={{
            fontSize: '40px',
            fill: 'white',
          }}
        />
        Start Learning!
      </Button>
    </Box>
  );
};

export default ChildHomeStartLearning;
