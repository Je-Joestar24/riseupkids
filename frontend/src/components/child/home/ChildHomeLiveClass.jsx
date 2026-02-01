import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StopIcon from '@mui/icons-material/Stop';
import liveIcon from '../../../assets/images/live.png';
import liveClassImage from '../../../assets/images/liveclass.jpeg';
import { themeColors } from '../../../config/themeColors';
import meetingService from '../../../services/meetingService';
import youtubeService from '../../../services/youtubeService';
import useYouTubeLive from '../../../hooks/youtubeHook';
import { useSelector } from 'react-redux';

const CARD_STYLE = {
  backgroundColor: 'white',
  padding: '24px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  border: `4px solid ${themeColors.secondary}`,
  borderRadius: '0px',
  overflow: 'hidden',
  marginTop: '16px',
};

/**
 * ChildHomeLiveClass Component
 *
 * Displays both:
 * - Live now: current YouTube Live (embedded) with optional End stream for teacher/admin
 * - Next Live Class: upcoming meeting (Google Meet) with Join button
 * Fetches active YouTube live and next upcoming meeting.
 */
const ChildHomeLiveClass = () => {
  const user = useSelector((state) => state.user?.user || state.auth?.user);
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const canEndYoutubeLive =
    isTeacherOrAdmin &&
    activeYoutubeLive &&
    (activeYoutubeLive.createdBy?._id?.toString() === user?._id?.toString() ||
      activeYoutubeLive.createdBy === user?._id?.toString());

  const [nextMeeting, setNextMeeting] = useState(null);
  const [activeYoutubeLive, setActiveYoutubeLive] = useState(null);
  const [meetingLoading, setMeetingLoading] = useState(true);
  const [youtubeLoading, setYoutubeLoading] = useState(true);
  const [meetingError, setMeetingError] = useState(null);

  const { endLive, actionLoading } = useYouTubeLive();

  const fetchNextMeeting = useCallback(async () => {
    try {
      setMeetingLoading(true);
      setMeetingError(null);
      const response = await meetingService.getUpcomingMeetings(1);
      if (response.success && response.data && response.data.length > 0) {
        setNextMeeting(response.data[0]);
      } else {
        setNextMeeting(null);
      }
    } catch (err) {
      console.error('[ChildHomeLiveClass] Error fetching upcoming meeting:', err);
      setMeetingError(err.message || 'Failed to load live class');
      setNextMeeting(null);
    } finally {
      setMeetingLoading(false);
    }
  }, []);

  const fetchActiveYoutubeLive = useCallback(async () => {
    try {
      setYoutubeLoading(true);
      const response = await youtubeService.getActiveLive();
      if (response.success && response.data) {
        setActiveYoutubeLive(response.data);
      } else {
        setActiveYoutubeLive(null);
      }
    } catch (err) {
      console.error('[ChildHomeLiveClass] Error fetching active YouTube live:', err);
      setActiveYoutubeLive(null);
    } finally {
      setYoutubeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextMeeting();
  }, [fetchNextMeeting]);

  useEffect(() => {
    fetchActiveYoutubeLive();
  }, [fetchActiveYoutubeLive]);

  const handleJoinClass = () => {
    if (!nextMeeting || !nextMeeting.meetLink) return;
    const guestLink = meetingService.getGuestModeLink(nextMeeting.meetLink);
    if (guestLink) {
      window.open(guestLink, '_blank', 'noopener,noreferrer');
    } else {
      window.open(nextMeeting.meetLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEndYoutubeLive = async () => {
    if (!activeYoutubeLive) return;
    const id = activeYoutubeLive._id || activeYoutubeLive.id;
    if (!window.confirm('End this live stream on YouTube? The broadcast will be marked complete.')) return;
    try {
      await endLive(id);
      setActiveYoutubeLive(null);
    } catch (err) {
      console.error('Failed to end live stream:', err);
    }
  };

  const formatMeetingDate = (dateString) => {
    if (!dateString) return 'TBD';
    const meetingDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const meetingDay = new Date(meetingDate);
    meetingDay.setHours(0, 0, 0, 0);
    if (meetingDay.getTime() === today.getTime()) return 'Today';
    if (meetingDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return meetingDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: meetingDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatMeetingTime = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getInstructorName = (meeting) => {
    if (meeting?.createdBy?.name) {
      return meeting.createdBy.role === 'admin' ? `with ${meeting.createdBy.name}` : `with Teacher ${meeting.createdBy.name}`;
    }
    return 'Starting soon!';
  };

  const loading = meetingLoading && youtubeLoading;
  const hasAny = activeYoutubeLive || nextMeeting;

  if (loading && !hasAny) {
    return (
      <Box sx={{ ...CARD_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <CircularProgress sx={{ color: themeColors.primary }} aria-label="Loading live class" />
      </Box>
    );
  }

  if (!hasAny && !meetingLoading && !youtubeLoading) {
    return null;
  }

  const embedUrl = activeYoutubeLive?.embedUrl || (activeYoutubeLive?.watchUrl
    ? activeYoutubeLive.watchUrl.replace(/\/watch\?v=/, '/embed/').split('&')[0]
    : null);

  return (
    <Box sx={{ marginTop: '16px' }}>
      {/* Live now: YouTube embed + End stream (teacher/admin) */}
      {activeYoutubeLive && (
        <Box sx={CARD_STYLE}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
            <Box
              component="img"
              src={liveIcon}
              alt=""
              sx={{ width: 48, height: 48, objectFit: 'cover' }}
            />
            <Box>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '18px', md: '22px' },
                  fontWeight: 600,
                  color: themeColors.primary,
                }}
              >
                Live now
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: themeColors.orange,
                }}
              >
                {activeYoutubeLive.title || 'Live stream'}
              </Typography>
            </Box>
            {canEndYoutubeLive && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<StopIcon />}
                onClick={handleEndYoutubeLive}
                disabled={actionLoading}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  textTransform: 'none',
                  borderRadius: 0,
                  borderColor: themeColors.orange,
                  color: themeColors.orange,
                  marginLeft: 'auto',
                  '&:hover': { borderColor: themeColors.orange, backgroundColor: `${themeColors.orange}14` },
                }}
              >
                End stream
              </Button>
            )}
          </Box>
          {embedUrl && (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: 0,
              }}
            >
              <iframe
                title={activeYoutubeLive.title || 'YouTube Live'}
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Next Live Class: Meeting (Google Meet) */}
      {nextMeeting && !meetingError && (
        <Box sx={CARD_STYLE}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'flex-start',
              gap: 2,
              marginBottom: 2,
            }}
          >
            <Box sx={{ flex: 1, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                <Box
                  sx={{
                    width: { xs: 80, md: 128 },
                    height: { xs: 80, md: 128 },
                    borderRadius: '50%',
                    backgroundColor: themeColors.orange,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    component="img"
                    src={liveIcon}
                    alt=""
                    sx={{ width: { xs: 48, md: 80 }, height: { xs: 48, md: 80 }, objectFit: 'cover' }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '20px', md: '24px' },
                      fontWeight: 600,
                      color: themeColors.primary,
                      marginBottom: 0.5,
                    }}
                  >
                    Next Live Class
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '16px', md: '18px' },
                      fontWeight: 500,
                      color: themeColors.orange,
                    }}
                  >
                    {getInstructorName(nextMeeting)}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' } }}>
              <Box sx={{ position: 'relative', width: { xs: '100%', md: 192 }, height: 128, overflow: 'hidden', marginBottom: 1 }}>
                <img
                  src={liveClassImage}
                  alt="Live class"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: 9999,
                    padding: '4px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 16, color: themeColors.primary }} />
                  <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: 14, fontWeight: 500, color: themeColors.text }}>
                    {formatMeetingTime(nextMeeting.startTime)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 0.5 }}>
                <CalendarTodayIcon sx={{ fontSize: 16, color: themeColors.accent }} />
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: 14, fontWeight: 500, color: themeColors.accent }}>
                  {formatMeetingDate(nextMeeting.startTime)}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: themeColors.primary,
                }}
              >
                {nextMeeting.title || 'Live Class'}
              </Typography>
            </Box>
          </Box>
          <Button
            onClick={handleJoinClass}
            fullWidth
            sx={{
              backgroundColor: themeColors.primary,
              color: 'white',
              padding: '20px 32px',
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: 'Quicksand, sans-serif',
              textTransform: 'none',
              borderRadius: 0,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              '&:hover': {
                backgroundColor: themeColors.primary,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                transform: 'scale(1.02)',
              },
            }}
          >
            <VideocamIcon sx={{ fontSize: 20 }} />
            Join Class
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ChildHomeLiveClass;
