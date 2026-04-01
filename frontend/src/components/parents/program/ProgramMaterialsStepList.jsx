import React from 'react';
import { Grid, Typography } from '@mui/material';

import { themeColors } from '../../../config/themeColors';
import ProgramMaterialsStepCard from './ProgramMaterialsStepCard';

const ProgramMaterialsStepList = ({ materials, onDownload }) => {
  const sortedMaterials = [...materials].sort((a, b) => (a?.stepNumber || 0) - (b?.stepNumber || 0));

  if (!materials.length) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: themeColors.textInverse,
          textAlign: 'center',
          py: 2,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
        }}
      >
        No materials available yet.
      </Typography>
    );
  }

  return (
    <Grid
      container
      spacing={{ xs: 1.5, sm: 2, md: 2.5 }}
      role="list"
      aria-label="Program material steps"
      alignItems="stretch"
    >
      {sortedMaterials.map((step) => (
        <Grid key={step.id || step.stepNumber} item xs={12} md={6} role="listitem" sx={{ display: 'flex' }}>
          <ProgramMaterialsStepCard step={step} onDownload={onDownload} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ProgramMaterialsStepList;
