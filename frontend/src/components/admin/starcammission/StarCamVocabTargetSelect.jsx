import React, { useMemo } from 'react';
import { Autocomplete, Chip, TextField, Typography } from '@mui/material';
import { normalizeVisionTarget } from '../../../utils/starCamVisionLabel.util';

function optionLabel(option) {
  if (!option) return '';
  return String(option.displayName || option.target || '');
}

const StarCamVocabTargetSelect = ({
  value = '',
  vocabOptions = [],
  onChange,
  disabled = false,
  size = 'small',
  label = 'Target',
  helperText = 'Must match one vocabulary detect target so audio can be resolved.',
  required = false,
}) => {
  const options = useMemo(
    () =>
      (vocabOptions || [])
        .map((entry) => {
          const displayName = String(entry?.displayText || entry?.word || entry?.target || '').trim();
          const target = normalizeVisionTarget(entry?.target || displayName);
          if (!target) return null;
          return {
            labelId: entry?.labelId || null,
            displayName: displayName || target,
            target,
            source: entry?.labelSource || entry?.source || 'oidv7',
            optionKey: `vocab:${target}`,
          };
        })
        .filter(Boolean),
    [vocabOptions]
  );

  const selectedOption = useMemo(() => {
    const target = normalizeVisionTarget(value);
    if (!target) return null;
    return options.find((option) => option.target === target) || {
      displayName: target,
      target,
      optionKey: `vocab:${target}`,
    };
  }, [options, value]);

  return (
    <Autocomplete
      size={size}
      disabled={disabled}
      options={options}
      value={selectedOption}
      onChange={(_event, option) => onChange?.(option?.target || '')}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(option, selected) => option?.optionKey === selected?.optionKey}
      noOptionsText="Add vocabulary targets first"
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {option.displayName}
            </Typography>
            {option.source === 'custom' ? (
              <Chip size="small" label="Custom" color="primary" variant="outlined" sx={{ ml: 1 }} />
            ) : null}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          helperText={helperText}
          inputProps={{
            ...params.inputProps,
            'aria-label': label,
            role: 'combobox',
          }}
        />
      )}
    />
  );
};

export default StarCamVocabTargetSelect;
