import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DashboardOutlined,
  AssignmentOutlined,
  PlayCircleOutlined,
  AutoStoriesOutlined,
  AutoAwesomeOutlined,
  NotificationsNone,
  TravelExploreOutlined,
} from '@mui/icons-material';
import { APP_VERSION } from '../../../config/constants';
import { areaForPath, creatorMenu } from '../../../utils/contentCreatorAccess';

// One icon per access area; the area list, order and addresses come from utils/contentCreatorAccess.js
const AREA_ICONS = {
  dashboard: <DashboardOutlined />,
  contents: <AssignmentOutlined />,
  built_in_books: <AutoStoriesOutlined />,
  explore: <PlayCircleOutlined />,
  star_cam_missions: <AutoAwesomeOutlined />,
  notifications: <NotificationsNone />,
  experiences: <TravelExploreOutlined />,
};

export const DRAWER_WIDTH = 280;

const ContentCreatorSidebar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user.user);

  // Only the areas an admin gave her: what she cannot use is simply not there
  const menuItems = creatorMenu(user).map((page) => ({
    key: page.key,
    text: page.label,
    icon: AREA_ICONS[page.key],
    path: page.path,
  }));
  const currentArea = areaForPath(location.pathname);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.border.main}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
        },
      }}
    >
      <Box
        sx={{
          padding: 3,
          paddingTop: '80px',
          paddingBottom: 2,
          borderBottom: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.custom.bgSecondary,
        }}
      >
        <Typography variant="h6" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
          Content Studio
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          Create and manage your assets
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', padding: 2 }}>
        <List sx={{ padding: 0 }}>
          {menuItems.map((item) => {
            // Create and edit pages (e.g. /experiences/create) keep their area highlighted
            const isActive = currentArea === item.key;
            return (
              <ListItem key={item.key} disablePadding sx={{ marginBottom: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  aria-label={`Navigate to ${item.text}`}
                  sx={{
                    minHeight: 52,
                    borderRadius: '12px',
                    backgroundColor: isActive ? theme.palette.orange.main : 'transparent',
                    color: isActive ? theme.palette.textCustom.inverse : theme.palette.text.primary,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 44, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ padding: 2.5, borderTop: `1px solid ${theme.palette.border.main}` }}>
        <Divider sx={{ marginBottom: 2 }} />
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
          Rise Up Kids v{APP_VERSION}
        </Typography>
      </Box>
    </Drawer>
  );
};

export default ContentCreatorSidebar;
