import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  ImageOutlined as ImageIcon,
  PlayCircleOutline as VideoIcon,
} from '@mui/icons-material';
import { updatedLabel, videoCountLabel } from '../../../utils/experienceAdminFormat';

const clamp = (lines) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
});

/**
 * One experience in the admin list: cover, position, title, description, number of videos, when it was
 * last changed, and its actions: publish or hide, edit, delete.
 *
 * @param {{ experience: object, busy?: 'publishing'|'unpublishing'|'deleting'|null, onTogglePublished: Function, onEdit: Function, onDelete: Function }} props
 */
const ExperienceCard = ({ experience, busy = null, onTogglePublished, onEdit, onDelete }) => {
  const theme = useTheme();
  const { title, description, coverImage, videoCount, isPublished, order, updatedAt } = experience;
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [coverImage]);

  const showCover = Boolean(coverImage) && !coverFailed;
  const updated = updatedLabel(updatedAt);
  const working = Boolean(busy);

  return (
    <Paper
      component="article"
      aria-label={title}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '14px',
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[1],
        opacity: busy === 'deleting' ? 0.6 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '16 / 9', backgroundColor: theme.palette.custom.bgSecondary }}>
        {showCover ? (
          <Box
            component="img"
            src={coverImage}
            alt={`${title} cover`}
            loading="lazy"
            onError={() => setCoverFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ height: '100%', color: theme.palette.text.secondary }}>
            <ImageIcon fontSize="large" aria-hidden />
            <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              No cover picture
            </Typography>
          </Stack>
        )}
        <Chip
          size="small"
          label={isPublished ? 'Published' : 'Draft'}
          color={isPublished ? 'success' : 'warning'}
          sx={{ position: 'absolute', top: 10, left: 10, fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}
        />
        {Number.isFinite(order) && order > 0 && (
          <Chip
            size="small"
            label={`#${order}`}
            aria-label={`Position ${order} in the list`}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontWeight: 700,
              fontFamily: 'Quicksand, sans-serif',
              backgroundColor: theme.palette.background.paper,
            }}
          />
        )}
      </Box>

      <Stack spacing={1} sx={{ p: 2, flex: 1 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3, ...clamp(2) }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, ...clamp(3) }}>
            {description}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.disabled, fontStyle: 'italic' }}>
            No description
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 'auto !important', pt: 0.5 }}>
          <Chip
            size="small"
            variant="outlined"
            icon={<VideoIcon />}
            label={videoCountLabel(videoCount)}
            sx={{ fontFamily: 'Quicksand, sans-serif' }}
          />
          {updated && (
            <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
              {updated}
            </Typography>
          )}
        </Stack>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ px: 2, py: 1.25, borderTop: `1px solid ${theme.palette.border.main}` }}
      >
        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Switch
              size="small"
              checked={Boolean(isPublished)}
              disabled={working}
              onChange={() => onTogglePublished(experience, !isPublished)}
              inputProps={{ 'aria-label': `${isPublished ? 'Unpublish' : 'Publish'} ${title}` }}
            />
          }
          label={
            <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}>
              {busy === 'publishing' ? 'Publishing…' : busy === 'unpublishing' ? 'Hiding…' : isPublished ? 'Visible to children' : 'Hidden'}
            </Typography>
          }
        />
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            startIcon={<EditIcon />}
            disabled={working}
            onClick={() => onEdit(experience)}
            aria-label={`Edit ${title}`}
            sx={{ textTransform: 'none', fontFamily: 'Quicksand, sans-serif' }}
          >
            Edit
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={working}
            onClick={() => onDelete(experience)}
            aria-label={`Delete ${title}`}
            sx={{ textTransform: 'none', fontFamily: 'Quicksand, sans-serif' }}
          >
            {busy === 'deleting' ? 'Deleting…' : 'Delete'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ExperienceCard;
