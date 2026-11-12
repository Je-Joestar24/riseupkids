import React from 'react';
import { FormHelperText, Stack } from '@mui/material';

/**
 * Under a text box: the problem (or a hint) on the left and "12 / 200" on the right. The count turns red
 * when the text is longer than allowed. `id` is what the box points to with aria-describedby.
 */
const FieldFooter = ({ id, error = '', hint = '', length = null, max = null }) => {
  const over = length !== null && max !== null && length > max;
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mx: '14px', mt: 0.5 }}>
      <FormHelperText id={id} error={Boolean(error)} sx={{ m: 0, fontFamily: 'Quicksand, sans-serif' }} role={error ? 'alert' : undefined}>
        {error || hint}
      </FormHelperText>
      {length !== null && max !== null && (
        <FormHelperText error={over} sx={{ m: 0, flexShrink: 0, fontFamily: 'Quicksand, sans-serif' }} aria-label={`${length} of ${max} characters`}>
          {length} / {max}
        </FormHelperText>
      )}
    </Stack>
  );
};

export default FieldFooter;
