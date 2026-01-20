import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { EXPLORE_VIDEO_TYPES } from '../../../constants/exploreVideoTypes';
import starsImage from '../../../assets/images/stars.png';

/**
 * Footer Titles for each video type
 */
const FOOTER_TITLES = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: "You're a Super Star!",
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "You're a Creative Genius!",
  [EXPLORE_VIDEO_TYPES.COOKING]: "You're a Master Chef!",
  [EXPLORE_VIDEO_TYPES.MUSIC]: "You're a Music Star!",
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: "You're Super Active!",
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: "You're a Story Master!",
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: "You're So Kind!",
};

/**
 * Footer Subtitles for each video type
 */
const FOOTER_SUBTITLES = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: "Keep watching and learning!",
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "Keep creating amazing art!",
  [EXPLORE_VIDEO_TYPES.COOKING]: "Keep cooking delicious meals!",
  [EXPLORE_VIDEO_TYPES.MUSIC]: "Keep making beautiful music!",
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: "Keep moving and staying healthy!",
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: "Keep reading wonderful stories!",
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: "Keep being kind and polite!",
};

/**
 * ExploreVideosFooter Component
 * 
 * Footer component for Explore Videos page with motivational message
 * 
 * @param {String} videoType - Video type (e.g., 'cooking', 'music', etc.)
 */
const ExploreVideosFooter = ({ videoType }) => {
  const footerTitle = FOOTER_TITLES[videoType] || "You're All Amazing!";
  const footerSubtitle = FOOTER_SUBTITLES[videoType] || "Keep learning and sharing! 🎉";

  return (
    <Box
      sx={{
        width: '100%',
        padding: '32px',
        backgroundColor: themeColors.bgCard,
        borderRadius: '0px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {/* First Star - Orange, 64px */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ fill: themeColors.orange, color: themeColors.orange }}
        >
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
        </svg>
        {/* Second Star - Accent, 80px (Center) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ fill: themeColors.accent, color: themeColors.accent }}
        >
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
        </svg>
        {/* Third Star - Secondary, 64px */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ fill: themeColors.secondary, color: themeColors.secondary }}
        >
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
        </svg>
      </Box>

      {/* Row 2: Main Title */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '30px',
          fontWeight: 700,
          color: themeColors.secondary,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {footerTitle}
      </Typography>

      {/* Row 3: Subtitle */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '20px',
          fontWeight: 600,
          color: 'oklch(0.446 0.03 256.802)',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {footerSubtitle}
      </Typography>
    </Box>
  );
};

export default ExploreVideosFooter;
