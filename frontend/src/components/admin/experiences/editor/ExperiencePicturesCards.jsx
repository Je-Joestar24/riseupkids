import React from 'react';
import { Box, Chip, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import { LIMITS, PRINTABLE_SOURCE } from '../../../../utils/experienceForm';
import SectionCard from './SectionCard';
import FieldFooter from './FieldFooter';
import ImagePicker from './ImagePicker';
import DocumentPicker from './DocumentPicker';

const PICTURE_HINT = 'JPG, PNG or WebP, up to 8 MB.';

/** The cover picture shown on the experience card and at the top of its page. */
export const ExperienceCoverCard = ({ picture, error = '', onPick, onRemove }) => (
  <SectionCard title="Cover picture" note="Shown on the experience card.">
    <ImagePicker id="cover-picture" label="Cover picture" picture={picture} error={error} hint={PICTURE_HINT} onPick={onPick} onRemove={onRemove} />
  </SectionCard>
);

const DOCUMENT_HINT = 'PDF or Word (DOC, DOCX), up to 20 MB.';

/**
 * The optional printable: what children print, given EITHER as a link to a file on our own website OR as a file that
 * is uploaded here (a PDF or a Word document), then the text of its button and a picture. All of it can stay empty.
 * The link and the file are chosen with a radio, so there is never a doubt about which one children get.
 */
export const ExperiencePrintableCard = ({
  printable,
  picture,
  document,
  linkError = '',
  buttonError = '',
  pictureError = '',
  documentError = '',
  onChange,
  onSourceChange,
  onPickDocument,
  onRemoveDocument,
  onPick,
  onRemove,
}) => {
  const asFile = printable.source === PRINTABLE_SOURCE.FILE;
  // Choosing "Link" over a saved file removes that file when the experience is saved: say so before it happens.
  const willRemoveSavedFile = !asFile && Boolean(document.url);

  return (
    <SectionCard
      title="Printable"
      note="Leave it all empty if there is nothing to print."
      action={<Chip size="small" variant="outlined" label="Optional" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }} />}
    >
      <FormControl sx={{ mb: 2, display: 'block' }}>
        <FormLabel id="printable-source-label" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '0.85rem' }}>
          What children print
        </FormLabel>
        <RadioGroup
          row
          aria-labelledby="printable-source-label"
          name="printable-source"
          value={printable.source}
          onChange={(event) => onSourceChange(event.target.value)}
        >
          <FormControlLabel value={PRINTABLE_SOURCE.LINK} control={<Radio size="small" />} label="Link" />
          <FormControlLabel value={PRINTABLE_SOURCE.FILE} control={<Radio size="small" />} label="Upload a file" />
        </RadioGroup>
      </FormControl>

      {asFile ? (
        <Box sx={{ mb: 2 }}>
          <DocumentPicker id="printable-document" document={document} error={documentError} hint={DOCUMENT_HINT} onPick={onPickDocument} onRemove={onRemoveDocument} />
        </Box>
      ) : (
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
          {willRemoveSavedFile && (
            <Typography variant="caption" role="note" sx={{ display: 'block', mt: 0.5, fontFamily: 'Quicksand, sans-serif', color: 'warning.dark' }}>
              The file that is saved now ({document.name || 'printable file'}) is removed when you save.
            </Typography>
          )}
        </Box>
      )}

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
};
