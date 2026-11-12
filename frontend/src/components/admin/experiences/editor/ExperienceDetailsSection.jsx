import React from 'react';
import { Box, TextField } from '@mui/material';
import { LIMITS } from '../../../../utils/experienceForm';
import SectionCard from './SectionCard';
import FieldFooter from './FieldFooter';

/** The title and the description, each with its own problem message and character count. */
const ExperienceDetailsSection = ({ title, description, titleError = '', descriptionError = '', onChange }) => (
  <SectionCard title="Details" note="What children see at the top of the experience.">
    <Box sx={{ mb: 2 }}>
      <TextField
        id="experience-title"
        label="Title"
        value={title}
        onChange={(event) => onChange('title', event.target.value)}
        error={Boolean(titleError)}
        fullWidth
        autoComplete="off"
        inputProps={{ 'aria-required': true, 'aria-describedby': 'experience-title-note' }}
      />
      <FieldFooter id="experience-title-note" error={titleError} length={title.trim().length} max={LIMITS.TITLE_MAX} />
    </Box>
    <Box>
      <TextField
        id="experience-description"
        label="Description"
        value={description}
        onChange={(event) => onChange('description', event.target.value)}
        error={Boolean(descriptionError)}
        fullWidth
        multiline
        minRows={3}
        maxRows={8}
        inputProps={{ 'aria-describedby': 'experience-description-note' }}
      />
      <FieldFooter id="experience-description-note" error={descriptionError} length={description.trim().length} max={LIMITS.DESCRIPTION_MAX} />
    </Box>
  </SectionCard>
);

export default React.memo(ExperienceDetailsSection);
