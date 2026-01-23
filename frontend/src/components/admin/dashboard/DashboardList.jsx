import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import adminDashboardService from '../../../services/adminDashboardService';

/**
 * DashboardList Component
 *
 * Simple, professional list showing recent signups
 * Minimalist design matching the admin dashboard
 */
const DashboardList = () => {
  const theme = useTheme();
  const [recentSignups, setRecentSignups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await adminDashboardService.getDashboardStats();
        if (response.data?.recent?.recentSignups) {
          setRecentSignups(response.data.recent.recentSignups);
        }
      } catch (error) {
        console.error('Failed to load recent signups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} sx={{ color: theme.palette.orange.main }} />
      </Box>
    );
  }

  if (!recentSignups || recentSignups.length === 0) {
    return (
      <Paper
        sx={{
          mt: 3,
          borderRadius: '16px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: theme.palette.text.primary,
              fontSize: '1.1rem',
              mb: 2,
            }}
          >
            Recent Signups
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
            }}
          >
            No recent signups to display.
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        mt: 3,
        borderRadius: '16px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            color: theme.palette.text.primary,
            fontSize: '1.1rem',
            mb: 0.5,
          }}
        >
          Recent Signups
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            fontSize: '0.875rem',
          }}
        >
          Last 7 days
        </Typography>
      </Box>

      <List sx={{ py: 0 }}>
        {recentSignups.map((user, index) => (
          <React.Fragment key={index}>
            <ListItem
              sx={{
                px: 3,
                py: 2,
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  backgroundColor: `${theme.palette.orange.main}15`,
                  color: theme.palette.orange.main,
                  mr: 2,
                  flexShrink: 0,
                }}
              >
                <PersonOutlineIcon sx={{ fontSize: 20 }} />
              </Box>
              <ListItemText
                primary={
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      fontSize: '0.95rem',
                    }}
                  >
                    {user.name}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: theme.palette.text.secondary,
                      fontSize: '0.875rem',
                      mt: 0.5,
                    }}
                  >
                    {user.email}
                  </Typography>
                }
              />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.secondary,
                  fontSize: '0.8rem',
                  ml: 2,
                  flexShrink: 0,
                }}
              >
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Typography>
            </ListItem>
            {index < recentSignups.length - 1 && (
              <Divider
                sx={{
                  mx: 3,
                  borderColor: theme.palette.border.main,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default DashboardList;
