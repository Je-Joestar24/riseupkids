import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import fireIcon from '../../../assets/images/fire.png';
import starIcon from '../../../assets/images/star.png';
import { themeColors } from '../../../config/themeColors';
import childrenService from '../../../services/childrenService';

/**
 * ChildHomeAccumlatedAwards Component
 * 
 * Displays accumulated awards: Day Streak, Total Stars, and Badges
 * Shows achievement metrics in a grid layout
 * 
 * Uses API to fetch child data for real-time accuracy,
 * especially for newly created children
 */
const ChildHomeAccumlatedAwards = ({ child: childProp }) => {
  const { id: childId } = useParams();
  const [child, setChild] = useState(childProp);

  // Fetch child data from API if not provided via props or on stats update
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
          console.error('[ChildHomeAccumlatedAwards] Error fetching child:', err);
        });
    }
  }, [childId, childProp]);

  // Update child when prop changes
  useEffect(() => {
    if (childProp && childProp._id) {
      setChild(childProp);
    }
  }, [childProp]);

  // Listen for child stats updates and refresh data from API
  useEffect(() => {
    const handleStatsUpdate = () => {
      const targetId = child?._id || childId;
      if (targetId) {
        childrenService.getChildById(targetId)
          .then((response) => {
            setChild(response.data || response);
          })
          .catch((err) => {
            console.error('[ChildHomeAccumlatedAwards] Error refreshing child:', err);
          });
      }
    };

    window.addEventListener('childStatsUpdated', handleStatsUpdate);
    return () => {
      window.removeEventListener('childStatsUpdated', handleStatsUpdate);
    };
  }, [child?._id, childId]);

  // Calculate achievements from child stats
  const achievements = useMemo(() => {
    if (child && child.stats) {
      return {
        dayStreak: child.stats.currentStreak || 0,
        totalStars: child.stats.totalStars || 0,
        badges: child.stats.totalBadges || (child.stats.badges ? child.stats.badges.length : 0),
      };
    }
    
    // Fallback defaults
    return {
      dayStreak: 0,
      totalStars: 0,
      badges: 0,
    };
  }, [child]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' },
        gap: '10px',
        marginTop: '16px',
      }}
    >
      {/* Day Streak Card */}
      <Box
        sx={{
          backgroundColor: 'white',
          padding: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {/* Fire Icon */}
        <Box
          sx={{
            width: '48px',
            height: '48px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={fireIcon}
            alt="Day Streak"
            style={{
              width: '48px',
              height: '48px',
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Count */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '30px',
            fontWeight: 600,
            color: themeColors.orange, // --theme-orange: #e98a68
            marginBottom: '4px',
            lineHeight: 1,
          }}
        >
          {achievements.dayStreak}
        </Typography>

        {/* Title */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            lineHeight: 1.4,
          }}
        >
          Day Streak
        </Typography>
      </Box>

      {/* Total Stars Card */}
      <Box
        sx={{
          backgroundColor: 'white',
          padding: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {/* Star Icon */}
        <Box
          sx={{
            width: '48px',
            height: '48px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={starIcon}
            alt="Total Stars"
            style={{
              width: '48px',
              height: '48px',
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Count */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '30px',
            fontWeight: 600,
            color: themeColors.orange, // --theme-orange: #e98a68
            marginBottom: '4px',
            lineHeight: 1,
          }}
        >
          {achievements.totalStars}
        </Typography>

        {/* Title */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            lineHeight: 1.4,
          }}
        >
          Total Stars
        </Typography>
      </Box>

      {/* Badges Card */}
      <Box
        sx={{
          backgroundColor: 'white',
          padding: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {/* Badge SVG Icon */}
        <Box
          sx={{
            width: '48px',
            height: '48px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={themeColors.warning} // --theme-warning: #f2af10
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: '48px',
              height: '48px',
            }}
            aria-hidden="true"
          >
            <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path>
            <circle cx="12" cy="8" r="6"></circle>
          </svg>
        </Box>

        {/* Count */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '30px',
            fontWeight: 600,
            color: themeColors.secondary, // --theme-secondary: #85c2b9
            marginBottom: '4px',
            lineHeight: 1,
          }}
        >
          {achievements.badges}
        </Typography>

        {/* Title */}
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            lineHeight: 1.4,
          }}
        >
          Badges
        </Typography>
      </Box>
    </Box>
  );
};

export default ChildHomeAccumlatedAwards;
