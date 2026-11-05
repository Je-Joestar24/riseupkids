import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import { themeColors } from '../../../config/themeColors';
import RemoteImage from '../common/RemoteImage';
import useCoursePrefetch from '../../../hooks/useCoursePrefetch';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';
import footstepsIcon from '../../../assets/images/footsteps.png';
import lockIcon from '../../../assets/images/lock.png';
import { isJourneyModuleLocked } from '../../../utils/journeyModuleAccess';
import { phoneFluid } from '../../../constants/childPhoneLayout';

/**
 * ChildJourneyCards Component
 * 
 * Card grid for displaying journey courses
 * 3-column grid layout with course data from API
 */
const ChildJourneyCards = ({ courses = [] }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id: childId } = useParams();
  const { prefetch, startHover, cancelHover } = useCoursePrefetch(childId);


  // Truncate description to 50 characters with ellipsis
  const truncateDescription = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Get border color based on status
  const getBorderColor = (status) => {
    switch (status) {
      case 'completed':
        return themeColors.secondary; // #85c2b9
      case 'in_progress':
      case 'not_started': // Treat not_started as in_progress for display
        return themeColors.accent; // #f2af10
      case 'locked':
        return 'rgb(212, 230, 227)'; // oklch(0.446 0.03 256.802)
      default:
        return themeColors.bgSecondary;
    }
  };

  // Get icon border color based on status
  const getIconBorderColor = (status) => {
    switch (status) {
      case 'completed':
        return themeColors.secondary; // #62caca (green circle border)
      case 'in_progress':
      case 'not_started': // Treat not_started as in_progress for display
        return themeColors.accent; // #f2af10 (yellow border)
      case 'locked':
        return themeColors.orange; // #e98a68 (orange border)
      default:
        return themeColors.border;
    }
  };

  // Get step badge background color based on status
  const getStepBadgeBackground = (status) => {
    switch (status) {
      case 'in_progress':
      case 'not_started': // Treat not_started as in_progress for display
        return themeColors.accent; // #f2af10
      case 'completed':
        return themeColors.primary; // #62caca
      case 'locked':
        return themeColors.bgTertiary;
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

    if (status === 'in_progress' || status === 'not_started') {
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
        {courses.length === 0 ? (
          <Box
            sx={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px 20px',
            }}
          >
            <Typography
              sx={{
                color: themeColors.textInverse,
                fontSize: '18px',
                fontFamily: theme.typography.fontFamily,
              }}
            >
              No courses available yet. Check back soon!
            </Typography>
          </Box>
        ) : (
          courses.map((courseItem, index) => {
            const course = courseItem.course || {};
            const status = courseItem.status || 'not_started';
            const isLocked = isJourneyModuleLocked(courseItem);
            // Use sequential position for step display (1, 2, 3...) 
            // Courses are already sorted by stepOrder from backend, so index + 1 represents the sequential position
            // This displays as "Step 1", "Step 2", etc. regardless of raw stepOrder values (10, 20, 30...)
            const stepOrder = index + 1;
            const coverImageUrl = getCoverImageUrl(course.coverImage);
            
            // Only completed, in-progress and not-started courses open, and not while locked.
            const isOpenable =
              (status === 'completed' || status === 'in_progress' || status === 'not_started') &&
              !isLocked &&
              Boolean(childId) &&
              Boolean(course._id || course.id);

            const handleCardClick = () => {
              if (!isOpenable) return;
              prefetch(courseItem); // does nothing if a press or hover already started it
              navigate(`/child/${childId}/journey/${course._id || course.id}`);
            };
            
            return (
              <Card
                key={course._id || course.id}
                onClick={handleCardClick}
                onPointerDown={isOpenable ? () => prefetch(courseItem) : undefined}
                onPointerEnter={isOpenable ? (event) => startHover(courseItem, event) : undefined}
                onPointerLeave={isOpenable ? cancelHover : undefined}
                sx={{
                  // phones: one card per row at 85% of the width, centred, like the app
                  width: { xs: '85%', sm: 'auto' },
                  marginLeft: { xs: 'auto', sm: 0 },
                  marginRight: { xs: 'auto', sm: 0 },
                  backgroundColor: themeColors.bgCard,
                  borderRadius: '0px',
                  overflow: 'hidden',
                  boxShadow: theme.shadows[4],
                  border: `3px solid ${getBorderColor(isLocked ? 'locked' : status)}`,
                  position: 'relative',
                  opacity: 1,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    // (a finger leaves no pointer behind, so on phones the grow effect would only stick)
                    transform: { xs: 'none', sm: isLocked ? 'none' : 'scale(1.05)' },
                    boxShadow: isLocked ? theme.shadows[4] : theme.shadows[8],
                  },
                }}
              >
              {/* Image Container */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  backgroundColor: themeColors.bgTertiary,
                  overflow: 'hidden',
                }}
              >
                {/* Course cover image */}
                {coverImageUrl ? (
                  <RemoteImage
                    src={coverImageUrl}
                    alt={course.title || 'Course cover'}
                    index={index}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
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
                )}

                {isLocked ? (
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
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <Box
                      component="img"
                      src={lockIcon}
                      alt="Locked journey step"
                      sx={{
                        width: { xs: phoneFluid(64, 92), sm: '92px' },
                        height: { xs: phoneFluid(64, 92), sm: '92px' },
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                ) : (
                  <>
                    {/* Status Icon - Top Left */}
                    {renderStatusIcon(status)}

                    {/* Step Badge - Top Right */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        backgroundColor: getStepBadgeBackground(status),
                        color: themeColors.textInverse,
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: theme.shadows[2],
                      }}
                    >
                      Step {stepOrder}
                    </Box>
                  </>
                )}
              </Box>

            {/* Card Content */}
            <Box
              sx={{
                padding: { xs: phoneFluid(14, 20), sm: '16px' },
                display: 'flex',
                gap: { xs: phoneFluid(10, 16), sm: '12px' },
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
                {/* Footsteps Icon */}
                <Box
                  sx={{
                    width: { xs: phoneFluid(40, 52), sm: '48px' },
                    height: { xs: phoneFluid(40, 52), sm: '48px' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: `0.5px solid ${getIconBorderColor(status)}`,
                    overflow: 'hidden',
                    backgroundColor: `${getIconBorderColor(status)}`,
                  }}
                >
                  {/* Footsteps image */}
                  <Box
                    component="img"
                    src={isLocked ? lockIcon : footstepsIcon}
                    alt={isLocked ? 'Locked step icon' : 'Footsteps icon'}
                    sx={{
                      width: isLocked ? '34px' : '100%',
                      height: isLocked ? '34px' : '100%',
                      objectFit: 'contain',
                      padding: '0px',
                    }}
                    aria-hidden="true"
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
                    fontSize: { xs: phoneFluid(15, 18), sm: '16px' },
                    fontWeight: 600,
                    color: themeColors.text,
                    fontFamily: theme.typography.fontFamily,
                    marginBottom: '4px',
                  }}
                >
                  {isLocked ? 'Locked Step' : course.title || 'Untitled Course'}
                </Typography>

                {/* Description */}
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: 'rgb(153, 153, 153)',
                    fontFamily: theme.typography.fontFamily,
                    lineHeight: 1.5,
                    fontWeight: 600,
                  }}
                  title={isLocked 
                    ? 'Complete previous steps to unlock'
                    : (course.description || 'No description available')}
                >
                  {isLocked 
                    ? 'Complete previous weeks to unlock'
                    : truncateDescription(course.description || 'No description available', 50)}
                </Typography>
              </Box>
            </Box>
          </Card>
          );
          })
        )}
      </Box>
    </Box>
  );
};

export default ChildJourneyCards;
