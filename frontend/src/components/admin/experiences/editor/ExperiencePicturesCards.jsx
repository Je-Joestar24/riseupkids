import React from 'react';
import { Box, Chip, TextField } from '@mui/material';
import { LIMITS } from '../../../../utils/experienceForm';
import SectionCard from './SectionCard';
import FieldFooter from './FieldFooter';
import ImagePicker from './ImagePicker';

const PICTURE_HINT = 'JPG, PNG or WebP, up to 8 MB.';

/** The cover picture shown on the experience card and at the top of its page. */
export const ExperienceCoverCard = ({ picture, error = '', onPick, onRemove }) => (
  <SectionCard title="Cover picture" note="Shown on the experience card.">
    <ImagePicker id="cover-picture" label="Cover picture" picture={picture} error={error} hint={PICTURE_HINT} onPick={onPick} onRemove={onRemove} />
  </SectionCard>
);

/**
 * The optional printable: a file children can print (a link on our own website), the text of its button and a
 * picture for it. All three can stay empty.
 */
export const ExperiencePrintableCard = ({ printable, picture, linkError = '', buttonError = '', pictureError = '', onChange, onPick, onRemove }) => (
  <SectionCard
    title="Printable"
    note="Leave all three empty if there is nothing to print."
    action={<Chip size="small" variant="outlined" label="Optional" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }} />}
  >
    <Box sx={{ mb: 2 }}>
      <TextField
        id="printable-link"
        label="Link to the file"
        value={printable.link}
        onChange={(event) => onChange('link', event.target.value)}
        error={Boolean(linkError)}
        placeholder="https://riseup.kids/downloads/recipe.pdf"
        fullWidth
        size="small"
        autoComplete="off"
        spellCheck={false}
        inputProps={{ 'aria-describedby': 'printable-link-note' }}
      />
      <FieldFooter id="printable-link-note" error={linkError} hint="A file on our own website (riseup.kids), starting with https." />
    </Box>
    <Box sx={{ mb: 2 }}>
      <TextField
        id="printable-button"
        label="Button text"
        value={printable.button}
        onChange={(event) => onChange('button', event.target.value)}
        error={Boolean(buttonError)}
        placeholder="Print here"
        fullWidth
        size="small"
        autoComplete="off"
        inputProps={{ 'aria-describedby': 'printable-button-note' }}
      />
      <FieldFooter id="printable-button-note" error={buttonError} hint="Empty shows “Print here”." length={printable.button.trim().length} max={LIMITS.PRINTABLE_BUTTON_MAX} />
    </Box>
    <ImagePicker
      id="printable-picture"
      label="Printable picture"
      picture={picture}
      error={pictureError}
      hint={PICTURE_HINT}
      aspectRatio="16 / 10"
      onPick={onPick}
      onRemove={onRemove}
    />
  </SectionCard>
);
