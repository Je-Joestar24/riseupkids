import React from 'react';
import { Alert, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { updatedLabel } from '../../../../utils/experienceAdminFormat';
import SectionCard from './SectionCard';

/**
 * Whether children can see the experience. Turning it on is allowed at any time; if the experience is not
 * complete enough, the card says what is missing and saving is refused until it is added (or this is turned
 * off again and it is saved as a draft).
 *
 * @param {{ isPublished: boolean, missing: string[], updatedAt?: string|null, onChange: (value: boolean) => void }} props
 */
const ExperienceStatusCard = ({ isPublished, missing = [], updatedAt = null, onChange }) => {
  const theme = useTheme();
  const updated = updatedLabel(updatedAt);
  return (
    <SectionCard title="Status">
      <FormControlLabel
        sx={{ m: 0, width: '100%', justifyContent: 'space-between', ml: 0 }}
        labelPlacement="start"
        control={<Switch checked={isPublished} onChange={(event) => onChange(event.target.checked)} />}
        label={<Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>Published</Typography>}
      />
      <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, mt: 0.5 }}>
        {isPublished ? 'Children can see it under Explore.' : 'A draft. Children cannot see it yet.'}
      </Typography>
      {isPublished && missing.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1.5, fontFamily: 'Quicksand, sans-serif' }}>
          <Stack component="span">To publish it, add {missing.join(' and ')}. Or turn Published off to save it as a draft.</Stack>
        </Alert>
      )}
      {updated && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
          {updated}
        </Typography>
      )}
    </SectionCard>
  );
};

export default ExperienceStatusCard;
