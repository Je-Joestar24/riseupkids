import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import liveIcon from '../../../assets/images/live.png';
import liveClassImage from '../../../assets/images/liveclass.jpeg';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildHomeLiveClass Component
 * 
 * Next Live Class card component for child home page
 * Displays upcoming live class information with image and join button
 */
const ChildHomeLiveClass = () => {
  const handleJoinClass = () => {
    // TODO: Implement join class functionality
    console.log('Join Class clicked');
  };

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: `4px solid ${themeColors.secondary}`, // --theme-secondary: #85c2b9
        borderRadius: '0px',
        overflow: 'hidden',
        marginTop: '16px',
      }}
    >
      {/* Top Section - Icon, Title, and Image */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Left Section - Icon and Text */}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            order: { xs: 1, md: 1 },
          }}
        >
          {/* Icon and Title Row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Circular Icon Container */}
            <Box
              sx={{
                width: { xs: '80px', md: '128px' },
                height: { xs: '80px', md: '128px' },
                borderRadius: '50%',
                backgroundColor: themeColors.orange, // --theme-orange: #e98a68
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={liveIcon}
                alt="Video"
                sx={{
                  width: { xs: '48px', md: '80px' },
                  height: { xs: '48px', md: '80px' },
                  objectFit: 'cover',
                }}
              />
            </Box>

            {/* Title and Subtitle */}
            <Box>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '20px', md: '24px' },
                  fontWeight: 600,
                  color: themeColors.primary, // --theme-primary: #62caca
                  lineHeight: 1.2,
                  marginBottom: '4px',
                }}
              >
                Next Live Class
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '16px', md: '18px' },
                  fontWeight: 500,
                  color: themeColors.orange, // --theme-orange: #e98a68
                  lineHeight: 1.4,
                }}
              >
                Starting soon!
              </Typography>
            </Box>
          </Box>

          {/* Instructor Name */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '16px', md: '18px' },
              fontWeight: '700',
              color: themeColors.textSecondary,
              marginBottom: 0,
              opacity:  '0.7'
            }}
          >
            with Ms. Sarah
          </Typography>
        </Box>

        {/* Right Section - Image with Time Badge */}
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
            order: { xs: 2, md: 2 },
          }}
        >
          {/* Image Container with Relative Positioning */}
          <Box
            sx={{
              position: 'relative',
              width: { xs: '100%', md: '192px' },
              height: '128px',
              overflow: 'hidden',
              marginBottom: '8px',
              borderRadius: '0px',
            }}
          >
            <img
              src={liveClassImage}
              alt="Live class"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Gradient Overlay */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent)',
              }}
            />
            {/* Floating Time Badge */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(4px)',
                borderRadius: '9999px',
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AccessTimeIcon
                sx={{
                  fontSize: '16px',
                  color: themeColors.primary,
                }}
              />
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: themeColors.text,
                }}
              >
                3:00 PM
              </Typography>
            </Box>
          </Box>

          {/* Calendar and Date */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <CalendarTodayIcon
              sx={{
                fontSize: '16px',
                color: themeColors.accent, // --theme-accent: #f2af10
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: themeColors.accent, // --theme-accent: #f2af10
              }}
            >
              Today
            </Typography>
          </Box>

          {/* Class Title */}
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              color: themeColors.primary, // --theme-primary: #62caca
              lineHeight: 1.4,
            }}
          >
            ABC Phonics Fun!
          </Typography>
        </Box>
      </Box>

      {/* Join Class Button */}
      <Button
        onClick={handleJoinClass}
        fullWidth
        sx={{
          backgroundColor: themeColors.primary, // --theme-accent: #f2af10
          color: 'white',
          padding: '20px 32px',
          fontSize: '24px',
          fontWeight: 600,
          fontFamily: 'Quicksand, sans-serif',
          textTransform: 'none',
          borderRadius: '0px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: themeColors.primary, 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        <VideocamIcon
          sx={{
            fontSize: '20px',
            fill: 'white',
          }}
        />
        Join Class
      </Button>
    </Box>
  );
};

export default ChildHomeLiveClass;
