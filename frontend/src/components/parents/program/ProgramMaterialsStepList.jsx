import React from 'react';
import { Grid, Typography } from '@mui/material';

import { themeColors } from '../../../config/themeColors';
import ProgramMaterialsStepCard from './ProgramMaterialsStepCard';

const ProgramMaterialsStepList = ({ materials, onDownload }) => {
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
    <Grid container spacing={2}>
      {materials.map((step) => (
        <Grid key={step.stepNumber} item xs={12} md={6}>
          <ProgramMaterialsStepCard step={step} onDownload={onDownload} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ProgramMaterialsStepList;
