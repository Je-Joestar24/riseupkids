import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { themeColors } from '../../../config/themeColors';

/**
 * ContactSupportFooter Component
 * 
 * Footer section with contact information
 * Displays email and other contact methods
 */
const ContactSupportFooter = () => {
  return (
    <Card
      sx={{
        borderRadius: { xs: '20px', sm: '24px' },
        backgroundColor: themeColors.bgCard,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <CardContent sx={{ padding: { xs: 3, sm: 3.75 } }}>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1rem', sm: '1.125rem' },
            fontWeight: 600,
            color: themeColors.secondary,
            marginBottom: 2,
          }}
        >
          Other Ways to Reach Us
        </Typography>
        
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            padding: 1.5,
            backgroundColor: `${themeColors.secondary}15`,
            borderRadius: { xs: '12px', sm: '16px' },
          }}
        >
          <EmailIcon
            sx={{
              fontSize: { xs: 24, sm: 24 },
              color: themeColors.secondary,
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                fontWeight: 400,
                color: themeColors.textSecondary,
                marginBottom: 0.5,
              }}
            >
              Email
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '1rem', sm: '1.125rem' },
                fontWeight: 600,
                color: themeColors.secondary,
              }}
            >
              support@kidslearn.com
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ContactSupportFooter;
