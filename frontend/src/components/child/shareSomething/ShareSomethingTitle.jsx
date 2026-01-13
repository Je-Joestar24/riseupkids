import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ShareSomethingTitle Component
 * 
 * Title input section for Share Something page
 */
const ShareSomethingTitle = ({ title, onTitleChange, maxLength = 50 }) => {
  const handleChange = (event) => {
    const value = event.target.value;
    // Limit to maxLength characters
    if (value.length <= maxLength && onTitleChange) {
      onTitleChange(value);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        padding: '24px',
        border: '4px solid',
        borderColor: 'rgb(253, 232, 222)',
        borderRadius: '0px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px',
      }}
    >
      {/* First Row: Title with Emoji */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: '36px',
            lineHeight: 1,
          }}
        >
          ✏️
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            color: themeColors.secondary,
            lineHeight: 1.2,
          }}
        >
          Give it a Title!
        </Typography>
      </Box>

      {/* Second Row: Input Field */}
      <TextField
        value={title || ''}
        onChange={handleChange}
        placeholder="My Awesome Creation!"
        fullWidth
        variant="outlined"
        inputProps={{
          maxLength: maxLength,
          style: {
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '20px',
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            padding: '16px',
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '20px',
            borderRadius: '0px',
            fontWeight: '600',
            '& fieldset': {
              borderColor: 'rgb(212, 230, 227)',
              borderWidth: '4px',
            },
            '&:hover fieldset': {
              borderColor: 'rgb(212, 230, 227)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgb(212, 230, 227)',
              borderWidth: '4px'
            },
          },
          '& .MuiInputBase-input': {
            padding: 0,
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '20px',
          },
        }}
        aria-label="Title input"
      />

      {/* Third Row: Character Counter */}
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '14px',
          fontWeight: 600,
          color: 'oklch(0.551 0.027 264.364)',
          lineHeight: 1.4,
        }}
      >
        {(title?.length || 0)}/{maxLength} letters
      </Typography>
    </Box>
  );
};

export default ShareSomethingTitle;
