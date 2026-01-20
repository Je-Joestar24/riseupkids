import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import { themeColors } from '../../../config/themeColors';

/**
 * DashboardHeader Component
 * 
 * Header section with welcome message and switch to child view button
 * Fully mobile responsive
 */
const DashboardHeader = ({ userName, onSwitchToChildView }) => {
  return (
    <>
      {/* Header with Title and Switch Button */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 2, sm: 0 },
          marginBottom: { xs: 3, sm: 4 },
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            fontWeight: 700,
            color: 'white',
          }}
        >
          Parent Dashboard
        </Typography>
      </Box>

      {/* Welcome Section */}
      <Card
        sx={{
          marginBottom: { xs: 3, sm: 4 },
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: themeColors.bgCard,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 1 }}>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 700,
                color: themeColors.secondary,
              }}
            >
              Welcome back, {userName}!
            </Typography>
            <WavingHandIcon
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                color: themeColors.accent,
              }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              color: themeColors.textSecondary,
            }}
          >
            Manage your children's learning journey and track their progress.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
};

export default DashboardHeader;
