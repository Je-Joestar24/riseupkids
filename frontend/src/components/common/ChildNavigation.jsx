import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Paper, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  HomeIcon,
  GlobeAltIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import childDarkIcon from '../../assets/images/child_dark.png';
import childWhiteIcon from '../../assets/images/child.png';
import { themeColors } from '../../config/themeColors';

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
 */
const ChildNavigation = ({ childId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Determine current route value
  const getCurrentValue = () => {
    const path = location.pathname;
    if (path.includes('/home')) return 'home';
    if (path.includes('/journey')) return 'journey';
    if (path.includes('/explore')) return 'explore';
    if (path.includes('/wall')) return 'wall';
    return 'home'; // Default to home
  };

  const [value, setValue] = React.useState(getCurrentValue());

  // Update value when route changes
  React.useEffect(() => {
    setValue(getCurrentValue());
  }, [location.pathname]);

  const handleNavigation = (route) => {
    setValue(route);
    navigate(`/child/${childId}/${route}`);
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
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            max-width: 36px !important;
            max-height: 36px !important;
          }
          .child-nav-icon svg {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            max-width: 36px !important;
            max-height: 36px !important;
          }
        `}
      </style>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderTop: `1px solid ${themeColors.border}`,
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
          backgroundColor: themeColors.bgCard,
          display: 'flex',
          alignItems: 'center',
          borderRadius: '0px'
        }}
        elevation={0}
      >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 0px',
          maxWidth: '1600px ', // max-w-6xl equivalent
          margin: '0 auto',
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
                minWidth: { xs: 'auto', sm: '258px' },
                flex: { xs: 1, sm: 'none' },
                minHeight: '68px',
                padding: '16px 8px',
                borderRadius: '0px',
                backgroundColor: isActive ? item.color : 'transparent',
                transition: 'all 0.3s ease',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isActive ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
                '&:hover': {
                  transform: 'scale(1.1)',
                  backgroundColor: isActive ? item.color : 'transparent',
                  boxShadow: 'none'
                },
                '&:active': {
                  transform: 'scale(1.05)',
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
                  width: '36px',
                  height: '36px',
                  color: isActive ? 'white' : inactiveColor,
                  '& > *': {
                    width: '36px !important',
                    height: '36px !important',
                  },
                  '& svg': {
                    color: isActive ? 'white' : inactiveColor,
                    stroke: isActive ? 'white' : inactiveColor,
                  },
                }}
              >
                {item.isImage ? (
                  <img
                    src={isActive ? item.imageWhite : item.imageDark}
                    alt={item.label}
                    style={{
                      width: '36px',
                      height: '36px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <Icon
                    className="child-nav-icon"
                    style={{
                      width: '36px',
                      height: '36px',
                      strokeWidth: 2,
                      color: isActive ? 'white' : inactiveColor,
                    }}
                  />
                )}
              </Box>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'white' : inactiveColor,
                  textTransform: 'none',
                  lineHeight: 1,
                  marginBottom: '10px'
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
