import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ShareSomethingDescription Component
 * 
 * Description text area section for Share Something page
 */
const ShareSomethingDescription = ({ description, onDescriptionChange, maxLength = 150 }) => {
  const handleChange = (event) => {
    const value = event.target.value;
    // Limit to maxLength characters
    if (value.length <= maxLength && onDescriptionChange) {
      onDescriptionChange(value);
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
          💭
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
          Tell Us About It!
        </Typography>
      </Box>

      {/* Second Row: Text Area */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          border: '4px solid',
          borderColor: 'rgb(212, 230, 227)',
          borderRadius: '0px',
        }}
      >
        <TextField
          value={description || ''}
          onChange={handleChange}
          placeholder="I made this because..."
          multiline
          rows={4}
          variant="outlined"
          inputProps={{
            maxLength: maxLength,
            style: {
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '20px',
            },
          }}
          sx={{
            maxWidth: '760px',
            width: '100%',
            '& .MuiOutlinedInput-root': {
              padding: '0px',
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '20px',
              borderRadius: '0px',
              height: '112px',
              fontWeight: 600,
              '& fieldset': {
                border: 'none',
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: 'none',
              },
            },
            '& .MuiInputBase-input': {
              padding: '0px',
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '20px',
              height: '112px !important',
              overflow: 'auto !important',
            },
          }}
          aria-label="Description input"
        />
      </Box>

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
        {(description?.length || 0)}/{maxLength} letters
      </Typography>
    </Box>
  );
};

export default ShareSomethingDescription;
