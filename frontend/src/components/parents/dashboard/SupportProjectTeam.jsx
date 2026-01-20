import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { themeColors } from '../../../config/themeColors';

/**
 * SupportProjectTeam Component
 * 
 * Support card with button
 * Fully mobile responsive
 */
const SupportProjectTeam = ({ onSupportClick }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        borderRadius: { xs: '16px', sm: '20px' },
        backgroundColor: themeColors.bgCard,
        border: `1px solid ${themeColors.border}`,
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, marginBottom: 2 }}>
          <HelpOutlineIcon
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem' },
              color: themeColors.accent,
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 700,
              color: themeColors.text,
            }}
          >
            Support
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '0.875rem', sm: '1rem' },
            color: themeColors.textSecondary,
            marginBottom: 2,
          }}
        >
          Get help and contact our team
        </Typography>
        <Button
          variant="contained"
          fullWidth
          onClick={onSupportClick}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            textTransform: 'none',
            backgroundColor: themeColors.accent,
            color: themeColors.textInverse,
            borderRadius: { xs: '8px', sm: '12px' },
            paddingY: { xs: '10px', sm: '12px' },
            '&:hover': {
              backgroundColor: themeColors.warning,
            },
          }}
        >
          Support
        </Button>
      </CardContent>
    </Card>
  );
};

export default SupportProjectTeam;
