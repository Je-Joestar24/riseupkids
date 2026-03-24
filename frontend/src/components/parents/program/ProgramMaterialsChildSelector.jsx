import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

const ProgramMaterialsChildSelector = ({
  children,
  selectedChildId,
  onChange,
  disabled,
}) => {
  return (
    <FormControl fullWidth size="small">
      <InputLabel
        id="materials-child-select-label"
        sx={{
          color: `${themeColors.textInverse}CC`,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          '&.Mui-focused': {
            color: themeColors.textInverse,
          },
        }}
      >
        Select Child
      </InputLabel>
      <Select
        labelId="materials-child-select-label"
        id="materials-child-select"
        value={selectedChildId}
        label="Select Child"
        onChange={onChange}
        disabled={disabled}
        inputProps={{ 'aria-label': 'Select child for printable materials' }}
        sx={{
          color: themeColors.textInverse,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          '.MuiOutlinedInput-notchedOutline': {
            borderColor: `${themeColors.textInverse}99`,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: `${themeColors.textInverse}CC`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: themeColors.textInverse,
          },
          '.MuiSvgIcon-root': {
            color: themeColors.textInverse,
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              '& .MuiMenuItem-root': {
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
              },
            },
          },
        }}
      >
        {children.map((child) => (
          <MenuItem key={child._id} value={child._id}>
            {child.displayName || 'Child'}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ProgramMaterialsChildSelector;
