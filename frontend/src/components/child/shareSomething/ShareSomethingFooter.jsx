import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ShareSomethingFooter Component
 * 
 * Description text area section for Share Something page
 */
const ShareSomethingFooter = () => {


    return (
        <Box
            sx={{
                width: '100%',
                padding: '24px',
                borderRadius: '0px',
                backgroundColor: 'white',
                marginBottom: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                alignContent: 'center',
                textAlign: 'center',
                boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px',
            }}
        >
            <Typography
                component="span"
                sx={{
                    fontSize: '60px',
                    lineHeight: 1,
                }}
            >
                ⭐
            </Typography>
            {/* First Row: Title with Emoji */}
            <Typography
                sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '30px',
                    fontWeight: 700,
                    color: themeColors.secondary,
                    lineHeight: 1.2,
                }}
            >
                You're Doing Great!
            </Typography>
            {/* Third Row: Character Counter */}
            <Typography
                sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'oklch(0.446 0.03 256.802)',
                    lineHeight: 1.4,
                }}
            >
                We can't wait to see your work! 💫
            </Typography>
        </Box>
    );
};

export default ShareSomethingFooter;
