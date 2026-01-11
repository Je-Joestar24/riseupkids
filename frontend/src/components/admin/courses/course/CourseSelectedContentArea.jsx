import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Button,
  Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, Image as ImageIcon, Reorder as ReorderIcon } from '@mui/icons-material';
import { CONTENT_TYPES } from '../../../../services/contentService';

/**
 * CourseSelectedContentArea Component
 *
 * Displays selected contents in card format, grouped by content type
 * - 3 columns layout per content type
 * - Always shows square images (placeholder if no image)
 * - Displays stars for each content item
 */
const CourseSelectedContentArea = ({ selectedContents = [], onRemove, onReorder }) => {
  const theme = useTheme();

  // Map backend content type to frontend format
  const mapBackendTypeToFrontend = (backendType) => {
    const mapping = {
      'activity': CONTENT_TYPES.ACTIVITY,
      'book': CONTENT_TYPES.BOOK,
      'video': CONTENT_TYPES.VIDEO,
      'audioAssignment': CONTENT_TYPES.AUDIO_ASSIGNMENT,
      'chant': CONTENT_TYPES.CHANT,
    };
    return mapping[backendType] || backendType;
  };

  // Get content type label
  const getContentTypeLabel = (backendType) => {
    const labels = {
      'activity': 'Activities',
      'book': 'Books',
      'video': 'Videos',
      'audioAssignment': 'Audio Assignments',
      'chant': 'Chants',
    };
    return labels[backendType] || backendType;
  };

  // Get stars value for content item
  const getStarsValue = (item) => {
    // Books use totalStarsAwarded, others use starsAwarded
    if (item.contentType === 'book' || item._contentType === CONTENT_TYPES.BOOK) {
      return item.totalStarsAwarded || item.starsAwarded || 0;
    }
    return item.starsAwarded || 0;
  };

  // Get cover image URL
  const getCoverImageUrl = (item) => {
    if (!item) return null;
    const coverImage = item.coverImage || item.thumbnail;
    if (!coverImage) return null;
    if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
      return coverImage;
    }
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${coverImage.startsWith('/') ? coverImage : `/${coverImage}`}`;
  };

  // Group selected contents by content type
  const groupedContents = {
    activity: [],
    book: [],
    video: [],
    audioAssignment: [],
    chant: [],
  };

  selectedContents.forEach((item) => {
    const contentType = item.contentType || item._contentType;
    if (groupedContents[contentType]) {
      groupedContents[contentType].push(item);
    }
  });

  // Filter out empty groups
  const nonEmptyGroups = Object.entries(groupedContents).filter(
    ([, items]) => items.length > 0
  );

  if (nonEmptyGroups.length === 0) {
    return null;
  }

  return (
    <Box sx={{ marginTop: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 2.5 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            color: theme.palette.text.primary,
          }}
        >
          Selected Contents ({selectedContents.length})
        </Typography>
        {onReorder && selectedContents.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<ReorderIcon />}
            onClick={onReorder}
            size="small"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Reorder Contents
          </Button>
        )}
      </Stack>

      {nonEmptyGroups.map(([contentType, items]) => (
        <Box key={contentType} sx={{ marginBottom: 4 }}>
          {/* Content Type Header */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              marginBottom: 2,
              color: theme.palette.text.primary,
              fontSize: '1.125rem',
            }}
          >
            {getContentTypeLabel(contentType)} ({items.length})
          </Typography>

          {/* Content Cards Grid - 4 columns */}
          <Grid container spacing={2}>
            {items.map((item, index) => {
              const coverImageUrl = getCoverImageUrl(item);
              const starsValue = getStarsValue(item);
              const itemTitle = item.title || 'Untitled';
              const itemId = item.contentId || item._id;

              return (
                <Grid item xs={6} sm={4} md={3} key={`${itemId}-${index}`}>
                  <Card
                    sx={{
                      position: 'relative',
                      borderRadius: '0px',
                      border: `1px solid ${theme.palette.border.main}`,
                      backgroundColor: theme.palette.background.paper,
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: theme.shadows[4],
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    {/* Remove Button */}
                    {onRemove && (
                      <IconButton
                        size="small"
                        onClick={() => onRemove(itemId, item.contentType || contentType)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          zIndex: 2,
                          backgroundColor: `${theme.palette.error.main}dd`,
                          color: theme.palette.common.white,
                          width: 24,
                          height: 24,
                          '&:hover': {
                            backgroundColor: theme.palette.error.main,
                          },
                          '& .MuiSvgIcon-root': {
                            fontSize: '1rem',
                          },
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    )}

                    {/* Cover Image - Always Square */}
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '100%', // Creates perfect square (1:1 aspect ratio)
                        overflow: 'hidden',
                        backgroundColor: theme.palette.custom.bgSecondary,
                      }}
                    >
                      {coverImageUrl ? (
                        <Box
                          component="img"
                          src={coverImageUrl}
                          alt={itemTitle}
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
                            backgroundColor: theme.palette.custom.bgSecondary,
                          }}
                        >
                          <ImageIcon
                            sx={{
                              fontSize: 32,
                              color: theme.palette.text.disabled,
                            }}
                          />
                        </Box>
                      )}

                      {/* Stars Badge - Upper left corner */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          zIndex: 1,
                        }}
                      >
                        <Chip
                          label={`⭐ ${starsValue}`}
                          size="small"
                          sx={{
                            backgroundColor: `${theme.palette.orange.main}ff`,
                            color: theme.palette.common.white,
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 600,
                            fontSize: '1.125rem', // 25% smaller than doubled (1.5rem * 0.75)
                            height: 36, // 25% smaller than doubled (48 * 0.75)
                            '& .MuiChip-label': {
                              padding: '0 12px', // 25% smaller than doubled (16px * 0.75)
                            },
                          }}
                        />
                      </Box>

                      {/* Content Type Badge - Lower right corner */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          zIndex: 1,
                        }}
                      >
                        <Chip
                          label={getContentTypeLabel(contentType)}
                          size="small"
                          sx={{
                            backgroundColor: `${theme.palette.primary.main}ff`,
                            color: theme.palette.common.white,
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 500,
                            fontSize: '1.05rem', // 25% smaller than doubled (1.4rem * 0.75)
                            height: 33, // 25% smaller than doubled (44 * 0.75)
                            '& .MuiChip-label': {
                              padding: '0 9px', // 25% smaller than doubled (12px * 0.75)
                            },
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Card Content */}
                    <CardContent
                      sx={{
                        padding: 1,
                        '&:last-child': {
                          paddingBottom: 1,
                        },
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 600,
                          fontSize: '1.125rem', // 25% smaller than doubled (1.5rem * 0.75)
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          color: theme.palette.text.primary,
                          minHeight: '3.375rem', // 25% smaller than doubled (4.5rem * 0.75)
                          lineHeight: 1.2,
                        }}
                      >
                        {itemTitle}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default CourseSelectedContentArea;

