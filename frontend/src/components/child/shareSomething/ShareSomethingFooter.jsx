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
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ fill: themeColors.accent, color: themeColors.accent }}
                >
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                </svg>
            </Box>
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
                We can't wait to see your work!
            </Typography>
        </Box>
    );
};

export default ShareSomethingFooter;
