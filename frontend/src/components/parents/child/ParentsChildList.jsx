import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import PersonIcon from '@mui/icons-material/Person';

/**
 * ParentsChildList Component
 * 
 * Displays list of child profiles
 * Shows child name, age, and avatar
 */
const ParentsChildList = ({ children = [], onSelectChild }) => {
  // Use placeholder data if no children provided (for development/testing)
  const childProfiles = children && children.length > 0 ? children : [
    { _id: '1', displayName: 'Emma', age: 7, avatar: null },
    { _id: '2', displayName: 'Liam', age: 6, avatar: null },
  ];

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
              {/* Avatar */}
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: `3px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'white',
                  flexShrink: 0,
                }}
              >
                {child.avatar ? (
                  <img
                    src={child.avatar}
                    alt={child.displayName}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <PersonIcon sx={{ fontSize: '2.5rem', color: borderColor }} />
                )}
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

