import React from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import { isPageComplete } from './BooksBuilderCreate.utils';

const BooksBuilderPageFields = ({ page, onPatch }) => {
  if (!page?.type) return null;

  return (
    <Stack spacing={1.5} sx={{ width: '100%', alignSelf: 'center', pt: 1 }}>
      <TextField
        label="Page title"
        size="small"
        value={page.title}
        onChange={(e) => onPatch({ title: e.target.value })}
      />

      {page.type === 'content' ? (
        <>
          <TextField label="Subtitle" size="small" value={page.subtitle} onChange={(e) => onPatch({ subtitle: e.target.value })} />
          <TextField label="Image URL (required)" size="small" value={page.imageUrl} onChange={(e) => onPatch({ imageUrl: e.target.value })} />
          <TextField label="Audio URL (required)" size="small" value={page.audioUrl} onChange={(e) => onPatch({ audioUrl: e.target.value })} />
        </>
      ) : null}

      {(page.type === 'intro' || page.type === 'demo' || page.type === 'reward') ? (
        <TextField
          label="Video URL (required)"
          size="small"
          value={page.videoUrl}
          onChange={(e) => onPatch({ videoUrl: e.target.value })}
        />
      ) : null}

      {page.type === 'interactive' ? (
        <>
          <TextField
            label="Interaction mode"
            size="small"
            placeholder="single_2x1 or parallel_2x2"
            value={page.interactionMode}
            onChange={(e) => onPatch({ interactionMode: e.target.value })}
          />
          <TextField
            label="Guide image 1 (required)"
            size="small"
            value={page.guideImageOne}
            onChange={(e) => onPatch({ guideImageOne: e.target.value })}
          />
          {page.interactionMode === 'parallel_2x2' ? (
            <TextField
              label="Guide image 2 (required for parallel)"
              size="small"
              value={page.guideImageTwo}
              onChange={(e) => onPatch({ guideImageTwo: e.target.value })}
            />
          ) : null}
        </>
      ) : null}

      <Typography
        variant="caption"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          color: isPageComplete(page) ? 'success.main' : 'warning.main',
          fontWeight: 700,
        }}
      >
        {isPageComplete(page) ? 'Page requirements completed' : 'Complete required fields to unlock next page'}
      </Typography>
    </Stack>
  );
};

export default BooksBuilderPageFields;
