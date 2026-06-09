import React from 'react';
import { Alert } from '@mui/material';

const DraftModuleBanner = ({ isPublished, itemLabelPlural = 'materials' }) => {
  if (isPublished !== false) return null;

  return (
    <Alert severity="info" role="status" aria-live="polite" sx={{ borderRadius: '10px' }}>
      This module is still a draft. You can add {itemLabelPlural} now; they will become visible to
      parents only after the module is published.
    </Alert>
  );
};

export default DraftModuleBanner;
