import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import useCourse from '../../../../hooks/courseHook';

/**
 * CourseCard Component
 *
 * Displays a single course/content collection card
 * Shows cover image, title, description, tags, content count, and status
 */
const CourseCard = ({ course, onEdit, onDelete, onView }) => {
  const theme = useTheme();
  const { getCoverImageUrl } = useCourse();

  const coverImageUrl = getCoverImageUrl(course.coverImage);
  const contentCount = course.contents?.length || course.contentCount || 0;
  const isPublished = course.isPublished;

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(course);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(course);
    }
  };

  const handleView = (e) => {
    e.stopPropagation();
    if (onView) {
      onView(course);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
        backgroundColor: theme.palette.background.paper,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: theme.shadows[8],
          transform: 'translateY(-4px)',
          borderColor: theme.palette.primary.main,
        },
      }}
      onClick={handleView}
    >
      {/* Cover Image */}
      {coverImageUrl ? (
        <CardMedia
          component="img"
          height="180"
          image={coverImageUrl}
          alt={course.title || 'Course cover'}
          sx={{
            objectFit: 'cover',
            backgroundColor: theme.palette.custom.bgSecondary,
          }}
        />
      ) : (
        <Box
          sx={{
            height: 180,
            backgroundColor: theme.palette.custom.bgSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.disabled,
              fontWeight: 700,
            }}
          >
            {course.title?.charAt(0)?.toUpperCase() || '?'}
          </Typography>
        </Box>
      )}

      {/* Card Content */}
      <CardContent
        sx={{
          flexGrow: 1,
          padding: 2.5,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Status Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 1.5 }}>
          <Chip
            label={isPublished ? 'Published' : 'Draft'}
            size="small"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              backgroundColor: isPublished
                ? theme.palette.success.light
                : theme.palette.warning.light,
              color: isPublished
                ? theme.palette.success.dark
                : theme.palette.warning.dark,
              fontSize: '0.75rem',
            }}
          />
          <Chip
            label={`${contentCount} ${contentCount === 1 ? 'item' : 'items'}`}
            size="small"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              backgroundColor: theme.palette.custom.bgSecondary,
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.125rem',
            marginBottom: 1,
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '3.375rem', // 2 lines height
          }}
        >
          {course.title || 'Untitled Course'}
        </Typography>

        {/* Description */}
        {course.description && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              marginBottom: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              flexGrow: 1,
            }}
          >
            {course.description}
          </Typography>
        )}

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              marginTop: 'auto',
            }}
          >
            {course.tags.slice(0, 3).map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '0.7rem',
                  height: 20,
                  backgroundColor: theme.palette.primary.light,
                  color: theme.palette.primary.dark,
                }}
              />
            ))}
            {course.tags.length > 3 && (
              <Chip
                label={`+${course.tags.length - 3}`}
                size="small"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '0.7rem',
                  height: 20,
                  backgroundColor: theme.palette.custom.bgSecondary,
                  color: theme.palette.text.secondary,
                }}
              />
            )}
          </Box>
        )}
      </CardContent>

      {/* Card Actions */}
      <CardActions
        sx={{
          padding: 1.5,
          borderTop: `1px solid ${theme.palette.border.main}`,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={isPublished ? 'Published' : 'Draft'}>
            <IconButton size="small" disabled>
              {isPublished ? (
                <VisibilityIcon fontSize="small" />
              ) : (
                <VisibilityOffIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit Course">
            <IconButton
              size="small"
              onClick={handleEdit}
              sx={{
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: `${theme.palette.primary.main}20`,
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Course">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                color: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: `${theme.palette.error.main}20`,
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
};

export default CourseCard;

