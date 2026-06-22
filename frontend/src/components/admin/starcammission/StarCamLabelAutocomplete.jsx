import React, { useMemo } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import useStarCamLabelSearch, { ADD_CUSTOM_OPTION_PREFIX } from '../../../hooks/useStarCamLabelSearch';
import {
  buildKeywordPayloadFromSelections,
  toAutocompleteOption,
  toLabelSelection,
} from '../../../utils/starCamVisionLabel.util';

function optionLabel(option) {
  if (!option) return '';
  if (option.isAddCustom) return `Add "${option.displayName}" as custom label`;
  return String(option.displayName || '');
}

function isSameTarget(left, right) {
  if (!left || !right) return false;
  return String(left.optionKey || left.target) === String(right.optionKey || right.target);
}

const StarCamLabelAutocomplete = ({
  selectedLabels = [],
  onChange,
  onDisplayNameSuggest,
  disabled = false,
  size = 'small',
  label = 'Detect Targets',
  helperText = 'Search and select multiple match words (synonyms, parts, or related terms).',
  required = false,
  error = false,
  maxSelections = 12,
}) => {
  const {
    inputValue,
    setInputValue,
    handleInputChange,
    options,
    loading,
    creating,
    error: searchError,
    createCustomLabel,
    loadRecentCustom,
  } = useStarCamLabelSearch({ enabled: !disabled });

  const selectedOptions = useMemo(
    () => (Array.isArray(selectedLabels) ? selectedLabels.map(toAutocompleteOption).filter(Boolean) : []),
    [selectedLabels]
  );

  const availableOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.isAddCustom ||
          !selectedOptions.some((selected) => isSameTarget(selected, toAutocompleteOption(toLabelSelection(option))))
      ),
    [options, selectedOptions]
  );

  const applySelections = (nextOptions) => {
    const payload = buildKeywordPayloadFromSelections(nextOptions);
    onChange?.(payload);
    if (payload.targetLabels?.[0]?.displayName && onDisplayNameSuggest) {
      onDisplayNameSuggest(payload.targetLabels[0].displayName);
    }
  };

  const handleAutocompleteChange = async (_event, newValue) => {
    const rawList = Array.isArray(newValue) ? newValue : [];
    const last = rawList[rawList.length - 1];

    if (last?.isAddCustom || String(last?.labelId || '').startsWith(ADD_CUSTOM_OPTION_PREFIX)) {
      const created = await createCustomLabel(last.displayName);
      setInputValue('');
      if (!created) return;
      const createdOption = toAutocompleteOption(created);
      if (!createdOption) return;
      if (selectedOptions.some((item) => isSameTarget(item, createdOption))) return;
      if (selectedOptions.length >= maxSelections) return;
      applySelections([...selectedOptions, createdOption]);
      return;
    }

    const normalized = rawList
      .map((entry) => (entry.isAddCustom ? null : toAutocompleteOption(toLabelSelection(entry) || entry)))
      .filter(Boolean)
      .slice(0, maxSelections);

    applySelections(normalized);
    setInputValue('');
  };

  return (
    <Box
      onFocus={() => {
        if (!disabled) void loadRecentCustom();
      }}
    >
      <Autocomplete
        multiple
        disableCloseOnSelect
        size={size}
        disabled={disabled || creating}
        options={availableOptions}
        value={selectedOptions}
        inputValue={inputValue}
        onInputChange={(_event, nextInput, reason) => {
          if (reason === 'input') {
            setInputValue(nextInput);
            handleInputChange(nextInput);
          }
        }}
        onChange={handleAutocompleteChange}
        getOptionLabel={optionLabel}
        isOptionEqualToValue={(option, selected) => isSameTarget(option, selected)}
        filterOptions={(opts) => opts}
        loading={loading || creating}
        noOptionsText={
          inputValue.trim().length < 2 ? 'Type at least 2 characters to search' : 'No labels found'
        }
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.optionKey || option.target}
              label={option.displayName}
              size="small"
              color={option.source === 'custom' ? 'primary' : 'default'}
              variant={index === 0 ? 'filled' : 'outlined'}
              aria-label={index === 0 ? `Primary detect target ${option.displayName}` : `Detect target ${option.displayName}`}
            />
          ))
        }
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          if (option.isAddCustom) {
            return (
              <Box component="li" key={key} {...rest} sx={{ fontWeight: 700 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {optionLabel(option)}
                </Typography>
              </Box>
            );
          }
          return (
            <Box component="li" key={key} {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {option.displayName}
              </Typography>
              {option.source === 'custom' ? (
                <Chip size="small" label="Custom" color="primary" variant="outlined" />
              ) : null}
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={error || Boolean(searchError)}
            helperText={
              searchError ||
              helperText ||
              (selectedOptions.length
                ? `${selectedOptions.length} selected. First chip is the primary target.`
                : 'Add at least one detect target.')
            }
            inputProps={{
              ...params.inputProps,
              'aria-label': label,
              role: 'combobox',
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading || creating ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
};

export default StarCamLabelAutocomplete;
