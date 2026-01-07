import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Collapse,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DashboardOutlined,
  PeopleOutline,
  MenuBookOutlined,
  SchoolOutlined,
  ForumOutlined,
  NotificationsNone,
  SettingsOutlined,
  HelpOutline,
  ExpandLess,
  ExpandMore,
  BookOutlined,
  AssignmentOutlined,
  PlayCircleOutlined,
} from '@mui/icons-material';
import { APP_VERSION } from '../../../config/constants';

export const DRAWER_WIDTH = 280;

/**
 * AdminSidebar Component
 * 
 * Premium vertical navigation sidebar for admin panel
 * Enhanced with rounded corners, padding, header, and footer
 */
const AdminSidebar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [coursesOpen, setCoursesOpen] = useState(
    location.pathname.startsWith('/admin/courses')
  );

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardOutlined />, path: '/admin/dashboard' },
    { text: 'Users', icon: <PeopleOutline />, path: '/admin/users' },
    {
      text: 'Courses',
      icon: <MenuBookOutlined />,
      path: '/admin/courses',
      subItems: [
        { text: 'Courses', icon: <BookOutlined />, path: '/admin/courses' },
        { text: 'Contents', icon: <AssignmentOutlined />, path: '/admin/courses/contents' },
      ],
    },
    { text: 'Learning Paths', icon: <SchoolOutlined />, path: '/admin/learning-paths' },
    { text: 'Communities', icon: <ForumOutlined />, path: '/admin/communities' },
    { text: 'Notifications', icon: <NotificationsNone />, path: '/admin/notifications' },
    { text: 'Settings', icon: <SettingsOutlined />, path: '/admin/settings' },
    { text: 'Support Desk', icon: <HelpOutline/>, path: '/admin/support'}
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleCoursesToggle = () => {
    setCoursesOpen(!coursesOpen);
  };

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
          borderRadius: '0px',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          padding: 3,
          paddingTop: '80px',
          paddingBottom: 2,
          borderBottom: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.custom.bgSecondary,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.125rem',
            color: theme.palette.text.primary,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Navigation
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
            marginTop: 0.5,
            display: 'block',
          }}
        >
          Manage your platform
        </Typography>
      </Box>

      {/* Menu Items Section */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          padding: 2,
        }}
      >
        <List sx={{ padding: 0 }}>
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path || 
              (item.subItems && item.subItems.some(sub => location.pathname === sub.path));
            const hasSubItems = item.subItems && item.subItems.length > 0;
            
            return (
              <React.Fragment key={item.text}>
                <ListItem 
                  disablePadding
                  sx={{ marginBottom: 0.5 }}
                >
                  <ListItemButton
                    onClick={hasSubItems ? handleCoursesToggle : () => handleNavigation(item.path)}
                    sx={{
                      minHeight: 52,
                      paddingX: 2.5,
                      paddingY: 1.5,
                      backgroundColor: isActive
                        ? theme.palette.orange.main
                        : 'transparent',
                      color: isActive
                        ? theme.palette.textCustom.inverse
                        : theme.palette.text.primary,
                      borderRadius: '12px',
                      marginX: 0.5,
                      '&:hover': {
                        backgroundColor: isActive
                          ? theme.palette.orange.dark
                          : theme.palette.custom.bgTertiary,
                        transform: 'translateX(4px)',
                      },
                      transition: 'all 0.2s ease',
                      boxShadow: isActive
                        ? `0 2px 8px ${theme.palette.orange.main}40`
                        : 'none',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 44,
                        color: isActive 
                          ? theme.palette.textCustom.inverse 
                          : theme.palette.text.secondary,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive
                          ? theme.palette.textCustom.inverse
                          : theme.palette.text.primary,
                        fontSize: '0.9375rem',
                        letterSpacing: '0.2px',
                      }}
                    />
                    {hasSubItems && (
                      coursesOpen ? <ExpandLess /> : <ExpandMore />
                    )}
                  </ListItemButton>
                </ListItem>
                {hasSubItems && (
                  <Collapse in={coursesOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem) => {
                        const isSubActive = location.pathname === subItem.path;
                        return (
                          <ListItemButton
                            key={subItem.text}
                            onClick={() => handleNavigation(subItem.path)}
                            sx={{
                              pl: 6,
                              minHeight: 44,
                              backgroundColor: isSubActive
                                ? theme.palette.orange.light
                                : 'transparent',
                              color: isSubActive
                                ? theme.palette.orange.dark
                                : theme.palette.text.primary,
                              borderRadius: '8px',
                              marginX: 0.5,
                              marginBottom: 0.25,
                              '&:hover': {
                                backgroundColor: isSubActive
                                  ? theme.palette.orange.main
                                  : theme.palette.custom.bgTertiary,
                                color: isSubActive
                                  ? theme.palette.textCustom.inverse
                                  : theme.palette.text.primary,
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 36,
                                color: isSubActive
                                  ? theme.palette.orange.dark
                                  : theme.palette.text.secondary,
                              }}
                            >
                              {subItem.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={subItem.text}
                              primaryTypographyProps={{
                                fontFamily: 'Quicksand, sans-serif',
                                fontWeight: isSubActive ? 600 : 500,
                                fontSize: '0.875rem',
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Footer Section */}
      <Box
        sx={{
          padding: 2.5,
          borderTop: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.custom.bgSecondary,
        }}
      >
        <Divider sx={{ marginBottom: 2 }} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            Rise Up Kids
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.6875rem',
              opacity: 0.7,
            }}
          >
            Version {APP_VERSION}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AdminSidebar;

