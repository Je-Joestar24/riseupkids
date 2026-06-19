import React from 'react';
import { Box, IconButton, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowUpward, ArrowDownward, DeleteOutline } from '@mui/icons-material';
import { getOppositeInteractiveOption } from './BooksBuilderCreate.utils';
import { createEmptyInteractiveLayouts } from '../../../utils/cmsInteractiveLayout';
import BooksBuilderTypeDropArea from './BooksBuilderTypeDropArea';
import BooksBuilderPageFields from './BooksBuilderPageFields';

const BooksBuilderPageSection = ({
  page,
  pageIndex,
  onOpenTypeMenu,
  onPatchPage,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onDeletePage,
  canDelete = false,
}) => {
  const theme = useTheme();
  const isMovableType = page?.type === 'content' || page?.type === 'interactive';

  return (
    <Paper
      sx={{
        p: { xs: 2, md: 3 },
        mb: 2,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.border.main}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
      }}
    >
      {page.type === 'interactive' ? (
        <Box
          role="group"
          aria-label={`Page ${pageIndex + 1} header`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            rowGap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Page {pageIndex + 1}</Typography>
            {isMovableType ? (
              <>
                <IconButton
                  size="small"
                  onClick={() => onMoveUp?.(pageIndex)}
                  disabled={!canMoveUp}
                  aria-label={`Move page ${pageIndex + 1} up`}
                >
                  <ArrowUpward fontSize="inherit" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onMoveDown?.(pageIndex)}
                  disabled={!canMoveDown}
                  aria-label={`Move page ${pageIndex + 1} down`}
                >
                  <ArrowDownward fontSize="inherit" />
                </IconButton>
              </>
            ) : null}
          </Box>
          <TextField
            label="Interactive type"
            size="small"
            select
            SelectProps={{
              MenuProps: {
                disableScrollLock: true,
                keepMounted: false,
              },
            }}
            value={page.interactionMode || 'two_options_one_answer'}
            onChange={(event) => {
              const nextMode = event.target.value;
              if (nextMode === 'two_options_two_answers') {
                const answerOne = page.answerOneCorrectOptionId || 'option_one';
                onPatchPage(pageIndex, {
                  interactionMode: nextMode,
                  answerOneCorrectOptionId: answerOne,
                  answerTwoCorrectOptionId: getOppositeInteractiveOption(answerOne),
                  interactiveLayouts: createEmptyInteractiveLayouts(true),
                });
                return;
              }
              onPatchPage(pageIndex, {
                interactionMode: nextMode,
                answerTwoCorrectOptionId: '',
                guideImageTwo: '',
                answerAudioTwo: '',
                sceneImageTwo: '',
                interactiveLayouts: createEmptyInteractiveLayouts(false),
              });
            }}
            sx={{
              minWidth: { xs: '100%', sm: 200 },
              maxWidth: { sm: 360 },
              flex: { sm: '1 1 auto' },
              ml: { sm: 0 },
            }}
          >
            <MenuItem value="two_options_one_answer">2 options, 1 answer</MenuItem>
            <MenuItem value="two_options_two_answers">2 options, 2 answers</MenuItem>
          </TextField>
          <IconButton
            size="medium"
            onClick={() => onDeletePage?.(pageIndex)}
            disabled={!canDelete}
            aria-label={`Delete page ${pageIndex + 1}`}
            sx={{
              ml: { sm: 0.5 },
              color: 'orange.main',
              '&:hover': { backgroundColor: 'rgba(233, 138, 104, 0.12)' },
            }}
          >
            <DeleteOutline fontSize="medium" />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Page {pageIndex + 1}</Typography>
            {isMovableType ? (
              <>
                <IconButton
                  size="small"
                  onClick={() => onMoveUp?.(pageIndex)}
                  disabled={!canMoveUp}
                  aria-label={`Move page ${pageIndex + 1} up`}
                >
                  <ArrowUpward fontSize="inherit" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onMoveDown?.(pageIndex)}
                  disabled={!canMoveDown}
                  aria-label={`Move page ${pageIndex + 1} down`}
                >
                  <ArrowDownward fontSize="inherit" />
                </IconButton>
              </>
            ) : null}
          </Box>
          <IconButton
            size="medium"
            onClick={() => onDeletePage?.(pageIndex)}
            disabled={!canDelete}
            aria-label={`Delete page ${pageIndex + 1}`}
            sx={{
              color: 'orange.main',
              '&:hover': { backgroundColor: 'rgba(233, 138, 104, 0.12)' },
            }}
          >
            <DeleteOutline fontSize="medium" />
          </IconButton>
        </Box>
      )}

      <BooksBuilderTypeDropArea
        page={page}
        pageIndex={pageIndex}
        onOpenTypeMenu={(targetEl) => onOpenTypeMenu(targetEl, pageIndex)}
        onPatch={(patch) => onPatchPage(pageIndex, patch)}
      />

      <BooksBuilderPageFields page={page} onPatch={(patch) => onPatchPage(pageIndex, patch)} />
    </Paper>
  );
};

export default BooksBuilderPageSection;
