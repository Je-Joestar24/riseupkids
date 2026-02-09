import React from 'react';
import { Box, Paper, Button, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

const STAR_SIZE_PX = '96px';
const CAMERA_SIZE_PX = '40px';

/**
 * Star icon SVG – background layer, 96×96px
 */

const starSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="exploreStarCamStarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffd966" stop-opacity="1"/>
      <stop offset="100%" stop-color="${themeColors.accent}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <path
    fill="url(#exploreStarCamStarGradient)"
    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
  />
</svg>
`;

const starUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(starSvg)}")`;

/**
 * Camera icon SVG – 40×40px, centered on top of the star
 */
const CameraIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="40"
        height="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="camera-svg"
        style={{ display: 'block' }}
        sx={{
            position: 'relative',
            left: 0,
            top: 0,
            width: CAMERA_SIZE_PX,
            height: CAMERA_SIZE_PX,
            minWidth: CAMERA_SIZE_PX,
            maxWidth: CAMERA_SIZE_PX,
            minHeight: CAMERA_SIZE_PX,
            maxHeight: CAMERA_SIZE_PX,
            zIndex: 1,
            inset: 1,
            color: 'white',
            filter: 'drop-shadow(rgba(0, 0, 0, 0.12) 0px 1px 3px)',
        }}
        aria-hidden
    >
        <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
        <circle cx="12" cy="13" r="3" />
    </svg>
);

/**
 * ExploreStarCam
 * Star Cam entry card: white card with a prominent Star + Camera button.
 * Uses themeColors.secondary for button bg, themeColors.accent for star fill.
 */
const ExploreStarCam = () => {
    return (
        <Paper
            elevation={0}
            sx={{
                backgroundColor: 'white',
                padding: '32px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                borderRadius: 0,
                marginTop: '32px'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    disableElevation
                    aria-label="Star Cam"
                    sx={{
                        backgroundColor: themeColors.primary,
                        color: 'white',
                        px: 0.5,
                        pr: 3,
                        py: 0,
                        minHeight: 56,
                        borderRadius: 0,
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
                        '&:hover': {
                            backgroundColor: '#6fb5ac',
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.14), 0 3px 8px rgba(0, 0, 0, 0.1)',
                            transform: 'scale(1.05)',
                        },
                        '&:active': {
                            transform: 'scale(0.95)',
                        },
                        transition: 'background-color 0.2s, box-shadow 0.2s, transform 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Box
                        sx={{
                            position: 'relative',
                            width: STAR_SIZE_PX,
                            height: STAR_SIZE_PX,
                            minWidth: STAR_SIZE_PX,
                            minHeight: STAR_SIZE_PX,
                            flexShrink: 0,
                            overflow: 'visible',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundImage: starUrl,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',

                        }}
                    >
                        <CameraIcon />
                    </Box>
                    <Typography
                        component="span"
                        sx={{
                            fontSize: 30,
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            color: themeColors.textInverse
                        }}
                    >
                        Star Cam
                    </Typography>
                </Button>
            </Box>
        </Paper>
    );
};

export default ExploreStarCam;
