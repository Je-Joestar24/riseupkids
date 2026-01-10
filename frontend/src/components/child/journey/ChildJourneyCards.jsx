import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildJourneyCards Component
 * 
 * Card grid for displaying journey courses
 * 3-column grid layout with completed and in-progress examples
 */
const ChildJourneyCards = () => {
  const theme = useTheme();

  // Example card data - will be replaced with course API data later
  const exampleCards = [
    {
      id: 1,
      title: 'Journey Rise Up 1',
      description: 'Learn letters and sounds.',
      image: '/api/placeholder/400/300',
      step: 1,
      status: 'completed', // 'completed', 'in_progress', 'locked'
    },
    {
      id: 2,
      title: 'Shape Explorer 1',
      description: 'Discover shapes around us.',
      image: '/api/placeholder/400/300',
      step: 3,
      status: 'in_progress', // 'completed', 'in_progress', 'locked'
    },
    {
      id: 3,
      title: 'Locked Week',
      description: 'Complete previous weeks to unlock',
      image: '/api/placeholder/400/300',
      step: 4,
      status: 'locked', // 'completed', 'in_progress', 'locked'
    },
  ];

  // Get border color based on status
  const getBorderColor = (status) => {
    switch (status) {
      case 'completed':
        return themeColors.secondary; // #85c2b9
      case 'in_progress':
        return themeColors.accent; // #f2af10
      case 'locked':
        return themeColors.bgOverlay; // oklch(0.446 0.03 256.802)
      default:
        return themeColors.bgSecondary;
    }
  };

  // Get icon background color based on status
  const getIconBackgroundColor = (status) => {
    switch (status) {
      case 'completed':
        return themeColors.primary; // #62caca
      case 'in_progress':
        return themeColors.accent; // #f2af10
      case 'locked':
        return themeColors.orange; // #e98a68
      default:
        return themeColors.bgTertiary;
    }
  };

  // Get step badge background color based on status
  const getStepBadgeBackground = (status) => {
    switch (status) {
      case 'in_progress':
        return themeColors.accent; // #f2af10
      case 'completed':
        return themeColors.primary; // #62caca
      default:
        return themeColors.bgTertiary;
    }
  };

  // Render status icon (top left)
  const renderStatusIcon = (status) => {
    if (status === 'completed') {
      return (
        <Box
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '40px',
            height: '40px',
            backgroundColor: themeColors.textInverse,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme.shadows[4],
          }}
        >
          {/* Circle-check icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: themeColors.primary }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        </Box>
      );
    }

    if (status === 'in_progress') {
      return (
        <Box
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '40px',
            height: '40px',
            backgroundColor: themeColors.textInverse,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme.shadows[4],
          }}
        >
          {/* Star icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={themeColors.accent}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: themeColors.accent }}
            aria-hidden="true"
          >
            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
          </svg>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '848px',
        backgroundColor: 'transparent',
      }}
    >
      {/* 3-Column Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr', // Single column on mobile
            sm: 'repeat(2, 1fr)', // 2 columns on small screens
            md: 'repeat(3, 1fr)', // 3 columns on medium+ screens
          },
          gap: '16px',
        }}
      >
        {exampleCards.map((card) => {
          const isLocked = card.status === 'locked';
          
          return (
            <Card
              key={card.id}
              sx={{
                backgroundColor: themeColors.bgCard,
                borderRadius: '0px',
                overflow: 'hidden',
                boxShadow: theme.shadows[4],
                border: `3px solid ${getBorderColor(card.status)}`,
                position: 'relative',
                opacity: isLocked ? 0.7 : 1,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              {/* Image Container */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '160px',
                  maxHeight: '160px',
                  backgroundColor: isLocked ? '#000000' : themeColors.bgTertiary,
                  overflow: 'hidden',
                }}
              >
                {isLocked ? (
                  // Locked state - centered lock icon
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Lock icon in white circle */}
                    <Box
                      sx={{
                        width: '56px', // 32px icon + 12px padding * 2 = 56px
                        height: '56px',
                        backgroundColor: themeColors.textInverse,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px',
                      }}
                    >
                      {/* Lock SVG icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: '#64748b' }}
                        aria-hidden="true"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </Box>
                  </Box>
                ) : (
                  <>
                    {/* Placeholder for image - will use course thumbnail later */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'gray',
                        color: themeColors.textInverse,
                        fontSize: '48px',
                      }}
                    >
                      📚
                    </Box>

                    {/* Status Icon - Top Left */}
                    {renderStatusIcon(card.status)}

                    {/* Step Badge - Top Right */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        backgroundColor: getStepBadgeBackground(card.status),
                        color: themeColors.textInverse,
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: theme.shadows[2],
                      }}
                    >
                      Step {card.step}
                    </Box>
                  </>
                )}
              </Box>

            {/* Card Content */}
            <Box
              sx={{
                padding: '16px',
                display: 'flex',
                gap: '12px',
              }}
            >
              {/* First Column - Icon */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexShrink: 0,
                }}
              >
                {/* Horizontal Rectangle Icon */}
                <Box
                  sx={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: getIconBackgroundColor(card.status),
                    borderRadius: '450%',
                  }}
                >
                  {/* Horizontal rectangle - white */}
                  <Box
                    sx={{
                      width: '24px',
                      height: '12px',
                      borderRadius: '0px',
                      backgroundColor: themeColors.textInverse, // White
                    }}
                  />
                </Box>
              </Box>

              {/* Second Column - Title and Description */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                }}
              >
                {/* Title */}
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: themeColors.text,
                    fontFamily: theme.typography.fontFamily,
                    marginBottom: '4px',
                  }}
                >
                  {card.title}
                </Typography>

                {/* Description */}
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: 'rgb(153, 153, 153)',
                    fontFamily: theme.typography.fontFamily,
                    lineHeight: 1.5,
                    fontWeight: 600
                  }}
                >
                  {card.description}
                </Typography>
              </Box>
            </Box>
          </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default ChildJourneyCards;
