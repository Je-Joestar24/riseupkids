import React from 'react';
import { Box, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getOppositeInteractiveOption } from './BooksBuilderCreate.utils';
import BooksBuilderTypeDropArea from './BooksBuilderTypeDropArea';
import BooksBuilderPageFields from './BooksBuilderPageFields';

const BooksBuilderPageSection = ({ page, pageIndex, onOpenTypeMenu, onPatchPage }) => {
  const theme = useTheme();

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
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Page {pageIndex + 1}</Typography>
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
                });
                return;
              }
              onPatchPage(pageIndex, {
                interactionMode: nextMode,
                answerTwoCorrectOptionId: '',
              });
            }}
            sx={{
              minWidth: { xs: '100%', sm: 200 },
              maxWidth: { sm: 360 },
              flex: { sm: '0 0 auto' },
              ml: { sm: 'auto' },
            }}
          >
            <MenuItem value="two_options_one_answer">2 options, 1 answer</MenuItem>
            <MenuItem value="two_options_two_answers">2 options, 2 answers</MenuItem>
          </TextField>
        </Box>
      ) : (
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Page {pageIndex + 1}</Typography>
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
