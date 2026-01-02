import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ParentsChildList Component
 * 
 * Displays list of child profiles
 * Shows child name, age, and avatar
 */
const ParentsChildList = ({ children = [], onSelectChild }) => {
  // Use actual children data from API
  const childProfiles = children || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {childProfiles.map((child, index) => {
        // Alternate colors for child cards
        const bgColor = index % 2 === 0 ? 'rgb(212, 230, 227)' : 'rgb(253, 232, 222)';
        const borderColor = index % 2 === 0 ? themeColors.primary : themeColors.orange;
        const textColor = index % 2 === 0 ? themeColors.primary : themeColors.orange;

        return (
          <Card
            key={child._id || index}
            onClick={() => onSelectChild && onSelectChild(child)}
            sx={{
              backgroundColor: bgColor,
              borderRadius: '0px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${borderColor}40`,
              },
            }}
          >
            <CardContent sx={{ padding: '20px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Avatar - Child-friendly with emoji */}
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  border: `4px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: child.avatar 
                    ? `url(${child.avatar}) center/cover`
                    : `linear-gradient(135deg, ${index % 2 === 0 ? '#62caca' : '#e98a68'} 0%, ${index % 2 === 0 ? '#85c2b9' : '#f2af10'} 100%)`,
                  flexShrink: 0,
                  position: 'relative',
                  boxShadow: `0 4px 12px ${borderColor}40`,
                }}
              >
                {!child.avatar && (
                  <Typography
                    sx={{
                      fontSize: '2.5rem',
                      lineHeight: 1,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                    }}
                  >
                    {index % 2 === 0 ? '🚀' : '⭐'}
                  </Typography>
                )}
                {/* Decorative circle */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: index % 2 === 0 ? '#f2af10' : '#62caca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem' }}>
                    {index % 2 === 0 ? '✨' : '🎨'}
                  </Typography>
                </Box>
              </Box>

              {/* Child Info */}
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.4rem',
                    color: textColor,
                    marginBottom: '4px',
                  }}
                >
                  {child.displayName}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '1rem',
                    color: themeColors.textSecondary,
                    fontWeight: '600',
                    opacity: '.7'
                  }}
                >
                  Age {child.age}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default ParentsChildList;

