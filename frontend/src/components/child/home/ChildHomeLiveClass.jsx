import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import liveIcon from '../../../assets/images/live.png';
import liveClassImage from '../../../assets/images/liveclass.jpeg';
import { themeColors } from '../../../config/themeColors';
import meetingService from '../../../services/meetingService';

/**
 * ChildHomeLiveClass Component
 * 
 * Next Live Class card component for child home page
 * Displays upcoming live class information with image and join button
 * Fetches the next upcoming meeting and allows child to join as guest
 */
const ChildHomeLiveClass = () => {
  const [nextMeeting, setNextMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch next upcoming meeting
  useEffect(() => {
    const fetchNextMeeting = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await meetingService.getUpcomingMeetings(1);
        if (response.success && response.data && response.data.length > 0) {
          setNextMeeting(response.data[0]);
        } else {
          setNextMeeting(null);
        }
      } catch (err) {
        console.error('[ChildHomeLiveClass] Error fetching upcoming meeting:', err);
        setError(err.message || 'Failed to load live class');
        setNextMeeting(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNextMeeting();
  }, []);

  const handleJoinClass = () => {
    if (!nextMeeting || !nextMeeting.meetLink) {
      return;
    }

    // Generate guest-mode link to force guest access
    // This ensures child joins as guest even if parent's Google account is logged in
    const guestLink = meetingService.getGuestModeLink(nextMeeting.meetLink);
    
    // Open in new tab
    if (guestLink) {
      window.open(guestLink, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback to original link
      window.open(nextMeeting.meetLink, '_blank', 'noopener,noreferrer');
    }
  };

  // Format date to "Today", "Tomorrow", or date string
  const formatMeetingDate = (dateString) => {
    if (!dateString) return 'TBD';
    
    const meetingDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const meetingDay = new Date(meetingDate);
    meetingDay.setHours(0, 0, 0, 0);

    if (meetingDay.getTime() === today.getTime()) {
      return 'Today';
    } else if (meetingDay.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return meetingDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: meetingDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Format time to 12-hour format
  const formatMeetingTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get instructor name from meeting data
  const getInstructorName = () => {
    if (nextMeeting?.createdBy?.name) {
      return `with ${nextMeeting.createdBy.name}`;
    }
    return 'Starting soon!';
  };

  // Don't show component if no upcoming meeting
  if (loading) {
    return (
      <Box
        sx={{
          backgroundColor: 'white',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: `4px solid ${themeColors.secondary}`,
          borderRadius: '0px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
        }}
      >
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  if (error || !nextMeeting) {
    // Don't show component if there's an error or no upcoming meeting
    return null;
  }

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
                {getInstructorName()}
              </Typography>
            </Box>
          </Box>
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
                {formatMeetingTime(nextMeeting.startTime)}
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
              {formatMeetingDate(nextMeeting.startTime)}
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
            {nextMeeting.title || 'Live Class'}
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
