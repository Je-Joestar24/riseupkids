import React, { memo, useMemo } from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  DeleteOutline as RemoveIcon,
  DragIndicator as DragIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { BUNNY_LINK_HINT, LIMITS, normalizeBunnyLink } from '../../../../utils/experienceForm';
import FieldFooter from './FieldFooter';

// On a narrow screen the two text buttons shrink to their icons (their names stay for screen readers).
const compactButton = { minWidth: 0, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } } };

/**
 * One video of the experience: its place in the list, a title, the Bunny link, and what can be done with it
 * (preview, move up or down, drag, remove). The place in the list is the position children see it in.
 *
 * Rows are memoised and take plain values, so typing in one row does not redraw the others.
 */
const ExperienceVideoRow = ({ video, index, isLast, titleError = '', linkError = '', autoFocus = false, onChange, onRemove, onMove, onPreview }) => {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: video.key });
  const number = index + 1;
  const link = useMemo(() => normalizeBunnyLink(video.embedUrl), [video.embedUrl]);

  // A "player" link is the same video; show it the way it will be saved as soon as the box is left.
  const tidyLink = () => {
    const next = link.url || video.embedUrl.trim();
    if (next !== video.embedUrl) onChange(video.key, { embedUrl: next });
  };

  return (
    <Box
      ref={setNodeRef}
      component="li"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        listStyle: 'none',
        // Wide: number and handle, the two boxes, the buttons. Narrow: the buttons move up beside the number so the boxes get the full width.
        display: 'grid',
        gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', sm: 'auto minmax(0, 1fr) auto' },
        gridTemplateAreas: { xs: '"handle actions" "fields fields"', sm: '"handle fields actions"' },
        alignItems: 'start',
        columnGap: 1.5,
        rowGap: 1,
        p: 1.5,
        mb: 1.5,
        borderRadius: '12px',
        border: `1px solid ${titleError || linkError ? theme.palette.error.main : theme.palette.border.main}`,
        backgroundColor: isDragging ? theme.palette.action.hover : theme.palette.custom.bgSecondary,
        opacity: isDragging ? 0.85 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : 'auto',
      }}
    >
      <Stack alignItems="center" spacing={0.5} sx={{ pt: 0.5, gridArea: 'handle' }}>
        <IconButton
          ref={setActivatorNodeRef}
          size="small"
          aria-label={`Drag to reorder video ${number}`}
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', touchAction: 'none', color: theme.palette.text.secondary }}
        >
          <DragIcon />
        </IconButton>
        <Typography component="span" aria-label={`Position ${number}`} sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>
          {number}
        </Typography>
      </Stack>

      <Stack spacing={1.5} sx={{ gridArea: 'fields', minWidth: 0 }}>
        <Box>
          <TextField
            id={`video-${video.key}-title`}
            label={`Video ${number} title`}
            value={video.title}
            onChange={(event) => onChange(video.key, { title: event.target.value })}
            error={Boolean(titleError)}
            autoFocus={autoFocus}
            fullWidth
            size="small"
            autoComplete="off"
            inputProps={{ 'aria-describedby': `video-${video.key}-title-note` }}
          />
          <FieldFooter id={`video-${video.key}-title-note`} error={titleError} length={video.title.trim().length} max={LIMITS.VIDEO_TITLE_MAX} />
        </Box>
        <Box>
          <TextField
            id={`video-${video.key}-link`}
            label={`Video ${number} Bunny link`}
            value={video.embedUrl}
            onChange={(event) => onChange(video.key, { embedUrl: event.target.value })}
            onBlur={tidyLink}
            error={Boolean(linkError)}
            placeholder={BUNNY_LINK_HINT}
            fullWidth
            size="small"
            autoComplete="off"
            spellCheck={false}
            inputProps={{ 'aria-describedby': `video-${video.key}-link-note`, style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
          <FieldFooter id={`video-${video.key}-link-note`} error={linkError} hint="Paste the embed link from Bunny." />
        </Box>
      </Stack>

      <Stack
        direction={{ xs: 'row', sm: 'column' }}
        spacing={0.5}
        alignItems={{ xs: 'center', sm: 'flex-start' }}
        justifyContent={{ xs: 'flex-end', sm: 'flex-start' }}
        sx={{ pt: 0.25, gridArea: 'actions', flexWrap: 'nowrap' }}
      >
        <Button
          size="small"
          startIcon={<PlayIcon />}
          disabled={Boolean(link.error)}
          onClick={() => onPreview({ title: video.title.trim() || `Video ${number}`, url: link.url })}
          aria-label={`Preview video ${number}`}
          sx={{ ...compactButton, textTransform: 'none', fontFamily: 'Quicksand, sans-serif' }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Preview
          </Box>
        </Button>
        <Stack direction="row">
          <Tooltip title="Move up">
            <span>
              <IconButton size="small" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move video ${number} up`}>
                <UpIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move down">
            <span>
              <IconButton size="small" disabled={isLast} onClick={() => onMove(index, index + 1)} aria-label={`Move video ${number} down`}>
                <DownIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Button
          size="small"
          color="error"
          startIcon={<RemoveIcon />}
          onClick={() => onRemove(video.key)}
          aria-label={`Remove video ${number}`}
          sx={{ ...compactButton, textTransform: 'none', fontFamily: 'Quicksand, sans-serif' }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Remove
          </Box>
        </Button>
      </Stack>
    </Box>
  );
};

export default memo(ExperienceVideoRow);
