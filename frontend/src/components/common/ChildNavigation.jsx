import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Paper, Button, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  HomeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import childDarkIcon from '../../assets/images/child_dark.png';
import childWhiteIcon from '../../assets/images/child.png';
import { themeColors } from '../../config/themeColors';

/**
 * Custom Sparkles Icon Component (SVG)
 */
const SparklesIcon = ({ color = 'currentColor', size = 36 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
    <path d="M20 2v4"></path>
    <path d="M22 4h-4"></path>
    <circle cx="4" cy="20" r="2"></circle>
  </svg>
);

/**
 * ChildNavigation Component
 * 
 * Fixed bottom navigation for child interface
 * Navigation items: Home, Journey, Explore, Kids' Wall
 * Specifications:
 * - Min width: 258px
 * - Height: 68px
 * - Padding: x = 8px, y = 16px
 * - Icons: outlined, 36px size
 * - Content centered
 * 
 * Supports location.state.from to override active nav:
 * - When navigating from Explore to /wall/share, Explore stays active
 * - This allows the share page to be accessed from multiple entry points
 */
const ChildNavigation = ({ childId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const iconSize = isPhone ? 37 : 36;

  // Determine current route value
  // Checks location.state.from to override active nav when needed
  const getCurrentValue = () => {
    const path = location.pathname;
    const fromState = location.state?.from;

    // If on /wall/share and came from explore, keep explore active
    if (path.includes('/wall/share') && fromState === 'explore') {
      return 'explore';
    }

    if (path.includes('/home')) return 'home';
    if (path.includes('/journey')) return 'journey';
    if (path.includes('/explore')) return 'explore'; // Includes /explore and /explore/videos
    if (path.includes('/wall')) return 'wall'; // Includes both /wall and /wall/share
    return 'home'; // Default to home
  };

  const [value, setValue] = React.useState(getCurrentValue());

  // Update value when route or state changes
  React.useEffect(() => {
    setValue(getCurrentValue());
  }, [location.pathname, location.state]);

  const handleNavigation = (route) => {
    setValue(route);
    // Clear state when navigating via bottom nav to reset active state
    navigate(`/child/${childId}/${route}`, { state: null });
  };

  // Active state background colors
  const activeColors = {
    home: 'rgb(98, 202, 202)', // Blue
    journey: 'rgb(233, 138, 104)', // Brown/red
    explore: 'rgb(242, 175, 16)', // Yellowish orange
    wall: 'rgb(212, 230, 227)', // Lighter blue
  };

  const navItems = [
    { value: 'home', label: 'Home', icon: HomeIcon, color: activeColors.home, isImage: false },
    { value: 'journey', label: 'My Journey', icon: null, color: activeColors.journey, isImage: true, imageDark: childDarkIcon, imageWhite: childWhiteIcon },
    { value: 'explore', label: 'Explore', icon: GlobeAltIcon, color: activeColors.explore, isImage: false },
    { value: 'wall', label: "Kids' Wall", icon: SparklesIcon, color: activeColors.wall, isImage: false },
  ];

  // Default inactive color
  const inactiveColor = 'rgba(123, 130, 149, 0.9)';

  return (
    <>
      <style>
        {`
          .child-nav-icon {
            width: ${iconSize}px !important;
            height: ${iconSize}px !important;
            min-width: ${iconSize}px !important;
            min-height: ${iconSize}px !important;
            max-width: ${iconSize}px !important;
            max-height: ${iconSize}px !important;
          }
          .child-nav-icon svg {
            width: ${iconSize}px !important;
            height: ${iconSize}px !important;
            min-width: ${iconSize}px !important;
            min-height: ${iconSize}px !important;
            max-width: ${iconSize}px !important;
            max-height: ${iconSize}px !important;
          }
        `}
      </style>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderTop: `1px solid ${themeColors.border}`,
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
          backgroundColor: themeColors.bgCard,
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'stretch', sm: 'center' },
          borderRadius: '0px',
        }}
        elevation={0}
      >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: { xs: 0, sm: '16px' },
          padding: { xs: '8px 0', sm: '16px 0' },
          maxWidth: { xs: '100%', sm: '1600px' },
          margin: '0 auto',
          justifyContent: { xs: 'space-between', sm: 'center' },
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = value === item.value;

          return (
            <Button
              key={item.value}
              onClick={() => handleNavigation(item.value)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                flex: { xs: '1 1 0', sm: 'none' },
                minWidth: { xs: 0, sm: '258px' },
                maxWidth: { xs: '25%', sm: 'none' },
                minHeight: { xs: '70px', sm: '68px' },
                padding: { xs: '8px 2px', sm: '16px 8px' },
                borderRadius: '0px',
                backgroundColor: isActive ? item.color : 'transparent',
                transition: 'all 0.3s ease',
                transform: {
                  xs: isActive ? 'scale(1.02)' : 'scale(1)',
                  sm: isActive ? 'scale(1.05)' : 'scale(1)',
                },
                boxShadow: isActive ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
                '&:hover': {
                  transform: { xs: 'none', sm: 'scale(1.1)' },
                  backgroundColor: isActive ? item.color : 'transparent',
                  boxShadow: 'none',
                },
                '&:active': {
                  transform: { xs: 'scale(0.98)', sm: 'scale(1.05)' },
                },
              }}
              aria-label={item.label}
            >
              <Box
                className="child-nav-icon"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: { xs: '37px', sm: '36px' },
                  height: { xs: '37px', sm: '36px' },
                  color: isActive 
                    ? (item.value === 'wall' ? themeColors.secondary : 'white')
                    : inactiveColor,
                  '& > *': {
                    width: `${iconSize}px !important`,
                    height: `${iconSize}px !important`,
                  },
                  '& svg': {
                    color: isActive 
                      ? (item.value === 'wall' ? themeColors.secondary : 'white')
                      : inactiveColor,
                    stroke: isActive 
                      ? (item.value === 'wall' ? themeColors.secondary : 'white')
                      : inactiveColor,
                  },
                }}
              >
                {item.isImage ? (
                  <img
                    src={isActive ? item.imageWhite : item.imageDark}
                    alt={item.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : item.value === 'wall' ? (
                  <SparklesIcon
                    color={isActive ? themeColors.secondary : inactiveColor}
                    size={iconSize}
                  />
                ) : (
                  <Icon
                    className="child-nav-icon"
                    style={{
                      width: '100%',
                      height: '100%',
                      strokeWidth: 2,
                      color: isActive ? 'white' : inactiveColor,
                    }}
                  />
                )}
              </Box>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '14px', sm: '14px' },
                  fontWeight: isActive ? 700 : 500,
                  color: isActive 
                    ? (item.value === 'wall' ? themeColors.secondary : 'white')
                    : inactiveColor,
                  textTransform: 'none',
                  lineHeight: 1.1,
                  marginBottom: { xs: 0, sm: '10px' },
                  textAlign: 'center',
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  width: '100%',
                }}
              >
                {item.label}
              </Typography>
            </Button>
          );
        })}
      </Box>
    </Paper>
    </>
  );
};

export default ChildNavigation;
