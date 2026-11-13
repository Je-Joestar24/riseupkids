import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../../config/themeColors';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { explorePath } from '../../../utils/experienceChildFormat';

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

/** Top card of the Experiences page: a way back to Explore, the title and one line of welcome. */
const ExperiencesHeader = ({ childId }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Paper
      component="header"
      sx={{
        width: '100%',
        padding: { xs: phoneFluid(16, 24), sm: '24px' },
        borderRadius: '0px',
        boxShadow: theme.shadows[2],
        border: `4px solid ${themeColors.orange}`,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '16px' }}>
        <Button
          onClick={() => navigate(explorePath(childId))}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: themeColors.secondary,
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: phoneFluid(16, 20), sm: '20px' },
            fontWeight: 600,
            textTransform: 'none',
            padding: 0,
            minWidth: 'auto',
            transition: 'transform 0.2s ease',
            '&:hover': { transform: { xs: 'none', sm: 'scale(1.05)' }, backgroundColor: 'transparent', boxShadow: 'none' },
          }}
        >
          <ArrowLeftIcon />
          Back to Explore
        </Button>
      </Box>

      <Typography
        component="h1"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: phoneFluid(24, 30), sm: '30px' },
          fontWeight: 600,
          color: themeColors.secondary,
          textAlign: 'center',
        }}
      >
        Experience
      </Typography>

      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: phoneFluid(16, 20), sm: '20px' },
          fontWeight: 600,
          color: 'oklch(0.551 0.027 264.364)',
          textAlign: 'center',
        }}
      >
        Fun things to watch, make and learn!
      </Typography>
    </Paper>
  );
};

export default ExperiencesHeader;
