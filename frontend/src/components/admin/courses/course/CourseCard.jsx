import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import useCourse from '../../../../hooks/courseHook';

/**
 * CourseCard Component
 *
 * Displays a single course/content collection card
 * Shows cover image, title, description, tags, content count, and status
 */
const CourseCard = ({ course, onEdit, onArchive, onView }) => {
  const theme = useTheme();
  const { getCoverImageUrl } = useCourse();
  const [anchorEl, setAnchorEl] = useState(null);

  const coverImageUrl = getCoverImageUrl(course.coverImage);
  const contentCount = course.contents?.length || course.contentCount || 0;
  const isPublished = course.isPublished;
  const isArchived = course.isArchived || false;

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) {
      onEdit(course);
    }
  };

  const handleArchive = () => {
    handleMenuClose();
    if (onArchive) {
      onArchive(course);
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
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0px',
        border: `1px solid ${theme.palette.border.main}`,
        backgroundColor: theme.palette.background.paper,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        overflow: 'visible',
        '&:hover': {
          boxShadow: theme.shadows[8],
          transform: 'translateY(-4px)',
          borderColor: theme.palette.primary.main,
        },
      }}
      onClick={handleView}
    >
      {/* Action Menu Button - Always visible */}
      <IconButton
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          backgroundColor: theme.palette.background.paper,
          opacity: 1,
          boxShadow: theme.shadows[2],
          '&:hover': {
            backgroundColor: theme.palette.custom.bgTertiary,
            boxShadow: theme.shadows[4],
          },
        }}
        onClick={handleMenuOpen}
      >
        <MoreVertIcon />
      </IconButton>

      {/* Cover Image */}
      {coverImageUrl ? (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '100%',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={coverImageUrl}
            alt={course.title || 'Course cover'}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Draft/Published Badge - Upper left */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 1,
            }}
          >
            <Chip
              label={isPublished ? 'Published' : 'Draft'}
              size="small"
              sx={{
                backgroundColor: isPublished
                  ? `${theme.palette.success.main}e0`
                  : `${theme.palette.grey[600]}e0`,
                color: theme.palette.textCustom.inverse || theme.palette.common.white,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                backdropFilter: 'blur(4px)',
              }}
            />
          </Box>
          {/* Item Count Badge - Lower right */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <Chip
              label={`${contentCount} ${contentCount === 1 ? 'item' : 'items'}`}
              size="small"
              sx={{
                backgroundColor: `${theme.palette.primary.main}e0`,
                color: theme.palette.textCustom.inverse || theme.palette.common.white,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                backdropFilter: 'blur(4px)',
              }}
            />
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '100%',
            backgroundColor: theme.palette.custom.bgSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.disabled,
              fontWeight: 700,
            }}
          >
            {course.title?.charAt(0)?.toUpperCase() || '?'}
          </Typography>
          {/* Draft/Published Badge - Upper left */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 1,
            }}
          >
            <Chip
              label={isPublished ? 'Published' : 'Draft'}
              size="small"
              sx={{
                backgroundColor: isPublished
                  ? `${theme.palette.success.main}e0`
                  : `${theme.palette.grey[600]}e0`,
                color: theme.palette.textCustom.inverse || theme.palette.common.white,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                backdropFilter: 'blur(4px)',
              }}
            />
          </Box>
          {/* Item Count Badge - Lower right */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <Chip
              label={`${contentCount} ${contentCount === 1 ? 'item' : 'items'}`}
              size="small"
              sx={{
                backgroundColor: `${theme.palette.primary.main}e0`,
                color: theme.palette.textCustom.inverse || theme.palette.common.white,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                backdropFilter: 'blur(4px)',
              }}
            />
          </Box>
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

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            fontFamily: 'Quicksand, sans-serif',
            minWidth: 150,
          },
        }}
      >
        <MenuItem
          onClick={handleEdit}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
          }}
        >
          <EditIcon sx={{ marginRight: 1, fontSize: 20 }} />
          Edit
        </MenuItem>
        {isArchived ? (
          <MenuItem
            onClick={handleArchive}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.success.main,
            }}
          >
            <RestoreIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Restore
          </MenuItem>
        ) : (
          <MenuItem
            onClick={handleArchive}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.warning.main,
            }}
          >
            <ArchiveIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Archive
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default CourseCard;

