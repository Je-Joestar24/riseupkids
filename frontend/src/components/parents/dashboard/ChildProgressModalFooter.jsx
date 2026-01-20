import React from 'react';
import { Box, Typography, Card, CardContent, Divider } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildProgressModalFooter Component
 * 
 * Footer section showing where stars came from (star sources)
 * Displays a list of sources like videos, books, activities, etc.
 */
const ChildProgressModalFooter = ({ starSources }) => {
  // Ensure starSources is an array
  const sources = Array.isArray(starSources) ? starSources : [];
  
  // Get color for each source type
  const getSourceColor = (sourceType) => {
    const colorMap = {
      'video': themeColors.primary, // Course videos - primary color
      'explore_video': themeColors.secondary, // Explore videos - secondary color
      'book': themeColors.primary,
      'lesson': themeColors.success,
      'lesson_item': themeColors.success,
      'activity': themeColors.warning,
      'audio_assignment': themeColors.secondary,
      'explore_content': themeColors.secondary,
      'kids_wall_post': themeColors.accent,
      'kids_wall_like': themeColors.accent,
      'badge': themeColors.warning,
      'streak': themeColors.success,
      'milestone': themeColors.primary,
      'other': themeColors.textSecondary,
    };
    return colorMap[sourceType] || themeColors.textSecondary;
  };

  return (
    <Card
      sx={{
        borderRadius: { xs: '12px', sm: '16px' },
        backgroundColor: themeColors.bgCard,
        border: `1px solid ${themeColors.border}`
      }}
    >
      <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1rem', sm: '1.25rem' },
            fontWeight: 700,
            color: themeColors.secondary,
            marginBottom: 2,
          }}
        >
          Star Sources
        </Typography>

        {sources && sources.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sources.map((item, index) => {
              const sourceColor = getSourceColor(item.sourceType);
              return (
                <Box key={item._id || index}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      paddingY: 1.5,
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                          fontWeight: 600,
                          color: themeColors.text,
                          marginBottom: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.title || 'Untitled'}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                          fontWeight: 500,
                          color: sourceColor,
                        }}
                      >
                        {item.sourceTypeLabel}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      <StarIcon
                        sx={{
                          fontSize: { xs: 16, sm: 18 },
                          color: themeColors.accent,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                          fontWeight: 700,
                          color: themeColors.text,
                          minWidth: '30px',
                        }}
                      >
                        {item.stars}
                      </Typography>
                    </Box>
                  </Box>
                  {index < sources.length - 1 && (
                    <Divider
                      sx={{
                        borderColor: themeColors.border,
                        opacity: 0.5,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: { xs: 3, sm: 4 },
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: { xs: 56, sm: 64 },
                height: { xs: 56, sm: 64 },
                borderRadius: '50%',
                backgroundColor: `${themeColors.accent}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 0.5,
              }}
            >
              <StarIcon
                sx={{
                  fontSize: { xs: 32, sm: 36 },
                  color: themeColors.accent,
                  opacity: 0.6,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                color: themeColors.textSecondary,
                textAlign: 'center',
              }}
            >
              No stars earned yet
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                color: themeColors.textMuted,
                textAlign: 'center',
                maxWidth: '300px',
              }}
            >
              Stars will appear here once your child starts earning them through activities, videos, and lessons
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ChildProgressModalFooter;
