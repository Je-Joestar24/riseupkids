import React from 'react';
import { useSelector } from 'react-redux';
import { AppBar, Box, Toolbar, IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import CloudIcon from '@mui/icons-material/Cloud';
import smallLogo from '../../assets/images/small-logo.png';
import { themeColors } from '../../config/themeColors';
import { phoneFluid } from '../../constants/childPhoneLayout';
import {
  CHILD_STATS_UPDATED_EVENT,
  getChildTotalStars,
} from '../../utils/childStatsSync';

/**
 * ChildHeader Component
 *
 * Sticky header for child interface
 * Shows logo centered and points/star button on the right
 */
const ChildHeader = ({ childId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const childProfiles = useSelector((state) => state.user.childProfiles);
  const [totalStars, setTotalStars] = React.useState(0);

  const readTotalStars = React.useCallback(() => {
    const id = childId != null ? String(childId) : '';
    if (!id) return 0;

    const profileFromStore = Array.isArray(childProfiles)
      ? childProfiles.find((profile) => String(profile._id) === id)
      : null;

    if (profileFromStore?.stats?.totalStars != null) {
      return Number(profileFromStore.stats.totalStars) || 0;
    }

    return getChildTotalStars(childId);
  }, [childId, childProfiles]);

  React.useEffect(() => {
    setTotalStars(readTotalStars());
  }, [readTotalStars]);

  React.useEffect(() => {
    const handleStatsUpdate = (event) => {
      const eventChildId = event?.detail?.childId;
      const eventTotalStars = event?.detail?.totalStars;

      if (eventChildId && String(eventChildId) !== String(childId)) {
        return;
      }

      if (eventTotalStars != null) {
        setTotalStars(Number(eventTotalStars) || 0);
        return;
      }

      setTotalStars(readTotalStars());
    };

    window.addEventListener(CHILD_STATS_UPDATED_EVENT, handleStatsUpdate);
    return () => {
      window.removeEventListener(CHILD_STATS_UPDATED_EVENT, handleStatsUpdate);
    };
  }, [childId, readTotalStars]);

  const handlePointsClick = () => {
    if (childId) {
      navigate(`/child/${childId}/profile`);
    }
  };

  const handleCloudClick = () => {
    console.log('Cloud clicked');
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderRadius: '0px',
        // phones: the app's 100px bar (computers and tablets keep 140px)
        minHeight: { xs: '100px', sm: '140px' },
        display: 'flex',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // (on tablets and computers the toolbar's own 64px rule has always been the one in effect)
          minHeight: { xs: '100px', sm: '64px' },
          padding: { xs: '0 16px', sm: '0 24px' },
          maxWidth: '1080px',
          margin: 'auto',
          width: '100%',
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src={smallLogo}
            alt="Rise Up Kids Logo"
            sx={{
              height: { xs: phoneFluid(52, 75), sm: '110px' },
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IconButton
            onClick={handlePointsClick}
            sx={{
              backgroundColor: themeColors.orange,
              color: 'white',
              padding: { xs: `${phoneFluid(10, 16)} ${phoneFluid(14, 28)}`, sm: '16px 32px' },
              // the star is text: on phones it scales with the number beside it
              fontSize: { xs: phoneFluid(20, 24), sm: '1.5rem' },
              borderRadius: '0px',
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 },
              '&:hover': {
                backgroundColor: '#d66b47',
                transform: { xs: 'none', sm: 'scale(1.05)' },
              },
              transition: 'all 0.3s ease',
            }}
            aria-label="Points"
          >
            ⭐
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: { xs: phoneFluid(20, 24), sm: '24px' },
                textTransform: 'none',
                color: 'white',
              }}
            >
              {totalStars}
            </Typography>
          </IconButton>

          <IconButton
            onClick={handleCloudClick}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: themeColors.textInverse,
              padding: '8px',
              borderRadius: '8px',
              // an invisible, do-nothing button (white on white): on phones it only takes room from the logo
              display: { xs: 'none', sm: 'inline-flex' },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s ease',
            }}
            aria-label="Sync"
          >
            <CloudIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ChildHeader;
