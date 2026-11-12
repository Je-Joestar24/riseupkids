import React, { useCallback, useMemo } from 'react';
import { Box, Button, Chip, FormHelperText, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AddCircleOutline as AddIcon, VideoLibraryOutlined as VideosIcon } from '@mui/icons-material';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LIMITS } from '../../../../utils/experienceForm';
import SectionCard from './SectionCard';
import ExperienceVideoRow from './ExperienceVideoRow';

/**
 * Where a drag ended, as a move in the list: `{ from, to }`, or null when nothing moved (dropped on itself,
 * or outside the list).
 * @param {Array<{ key: string }>} videos
 * @param {{ active?: { id: string }, over?: { id: string }|null }} event
 */
export const moveForDrag = (videos, { active, over } = {}) => {
  if (!active || !over || active.id === over.id) return null;
  const from = videos.findIndex((video) => video.key === active.id);
  const to = videos.findIndex((video) => video.key === over.id);
  return from === -1 || to === -1 ? null : { from, to };
};

const NO_ROW_ERRORS = Object.freeze({});

// Fixed objects: new ones on every draw would make the drag-and-drop think its settings changed and redraw every row.
const POINTER_OPTIONS = Object.freeze({ activationConstraint: { distance: 6 } });
const KEYBOARD_OPTIONS = Object.freeze({ coordinateGetter: sortableKeyboardCoordinates });

/**
 * The ordered list of videos. A video can be moved by dragging it, or with the arrow buttons (which also work
 * from the keyboard). The list order is the order, and the position, children see.
 */
const ExperienceVideosSection = ({ videos, error = '', rowErrors = NO_ROW_ERRORS, focusKey = null, onAdd, onChange, onRemove, onMove, onPreview }) => {
  const theme = useTheme();
  const sensors = useSensors(useSensor(PointerSensor, POINTER_OPTIONS), useSensor(KeyboardSensor, KEYBOARD_OPTIONS));

  const handleDragEnd = useCallback(
    (event) => {
      const move = moveForDrag(videos, event);
      if (move) onMove(move.from, move.to);
    },
    [videos, onMove]
  );

  // The list of keys only changes when a video is added, removed or moved, not when one is typed in: a new
  // array every time would make every row redraw on every keystroke.
  const keysSignature = videos.map((video) => video.key).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const keys = useMemo(() => videos.map((video) => video.key), [keysSignature]);

  const full = videos.length >= LIMITS.MAX_VIDEOS;

  return (
    <SectionCard
      title="Videos"
      note="Children watch them in this order. Drag a video, or use the arrows, to move it."
      action={<Chip size="small" variant="outlined" label={`${videos.length} of ${LIMITS.MAX_VIDEOS}`} sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }} />}
    >
      {videos.length === 0 ? (
        <Stack
          alignItems="center"
          spacing={0.5}
          sx={{
            py: 3,
            px: 2,
            mb: 1.5,
            textAlign: 'center',
            borderRadius: '12px',
            border: `1px dashed ${error ? theme.palette.error.main : theme.palette.border.secondary}`,
            color: theme.palette.text.secondary,
          }}
        >
          <VideosIcon aria-hidden />
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>No videos yet</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
            Add at least one video before the experience can be published.
          </Typography>
        </Stack>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={keys} strategy={verticalListSortingStrategy}>
            <Box component="ol" aria-label="Videos" sx={{ m: 0, p: 0 }}>
              {videos.map((video, index) => (
                <ExperienceVideoRow
                  key={video.key}
                  video={video}
                  index={index}
                  isLast={index === videos.length - 1}
                  titleError={rowErrors[video.key]?.title || ''}
                  linkError={rowErrors[video.key]?.embedUrl || ''}
                  autoFocus={video.key === focusKey}
                  onChange={onChange}
                  onRemove={onRemove}
                  onMove={onMove}
                  onPreview={onPreview}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}

      {error && (
        <FormHelperText error role="alert" sx={{ mx: 0, mb: 1, fontFamily: 'Quicksand, sans-serif' }}>
          {error}
        </FormHelperText>
      )}

      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Button
          id="experience-add-video"
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={full}
          onClick={onAdd}
          sx={{ textTransform: 'none', borderRadius: '10px', fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
        >
          Add video
        </Button>
        {full && (
          <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
            You have reached the limit of {LIMITS.MAX_VIDEOS} videos.
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
};

export default ExperienceVideosSection;
