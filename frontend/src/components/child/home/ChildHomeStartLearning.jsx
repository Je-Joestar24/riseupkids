import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import sampleImage from '../../../assets/images/sample.webp';
import { themeColors } from '../../../config/themeColors';
import { useNavigate, useParams } from 'react-router-dom';
import { InlineBone } from '../common/ChildSkeleton';
import { phoneFluid } from '../../../constants/childPhoneLayout';

/**
 * ChildHomeStartLearning Component
 * 
 * Welcome card component for child home page
 * Displays personalized greeting with avatar and start learning button.
 * The child record comes from the page; `loading` holds the name's place until it arrives.
 */
const ChildHomeStartLearning = ({ child, loading = false }) => {
  const navigate = useNavigate();
  const { id: childId } = useParams();

  const handleStartLearning = () => {
    navigate(`/child/${childId}/explore`);
  };

  return (
    <Box
      aria-busy={loading}
      sx={{
        backgroundColor: 'white',
        padding: { xs: phoneFluid(16, 28), sm: '32px' },
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: `4px solid ${themeColors.orange}`, // --theme-orange: #e98a68
        borderRadius: '0px',
      }}
    >
      {/* Avatar and Greeting Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: phoneFluid(10, 16), sm: '16px' },
          marginBottom: { xs: phoneFluid(16, 24), sm: '24px' },
        }}
      >
        {/* Avatar */}
        <Box
          sx={{
            width: { xs: phoneFluid(64, 96), sm: '128px' },
            height: { xs: phoneFluid(64, 96), sm: '128px' },
            borderRadius: '50%',
            backgroundColor: themeColors.primary, // --theme-primary: #62caca
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: { xs: phoneFluid(9, 15), sm: '20px' },
            flexShrink: 0,
          }}
        >
          <img
            src={sampleImage}
            alt="Child Avatar"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
        </Box>

        {/* Greeting Text (phones: takes the room left beside the avatar so a long name wraps inside the card) */}
        <Box sx={{ flex: { xs: '1 1 0', sm: '0 1 auto' }, minWidth: { xs: 0, sm: 'auto' } }}>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: phoneFluid(22, 30), sm: '36px' },
              overflowWrap: { xs: 'anywhere', sm: 'normal' },
              fontWeight: 600,
              color: themeColors.primary, // --theme-primary: #62caca
              marginBottom: '4px',
              lineHeight: 1.2,
            }}
          >
            {loading ? <InlineBone width="200px" /> : `Hi, ${child ? child.displayName : 'Friend'}!`}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: phoneFluid(15, 19), sm: '20px' },
              color: themeColors.textSubheading,
              lineHeight: 1.4,
            }}
          >
            Ready to learn something awesome?
          </Typography>
        </Box>
      </Box>

      {/* Start Learning Button */}
      <Button
        onClick={handleStartLearning}
        fullWidth
        sx={{
          backgroundColor: themeColors.accent, // --theme-accent: #f2af10
          color: 'white',
          padding: { xs: `${phoneFluid(14, 22)} ${phoneFluid(12, 24)}`, sm: '24px 32px' },
          fontSize: { xs: phoneFluid(18, 24), sm: '24px' },
          fontWeight: 600,
          fontFamily: 'Quicksand, sans-serif',
          textTransform: 'none',
          whiteSpace: { xs: 'nowrap', sm: 'normal' },
          borderRadius: '0px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: phoneFluid(6, 10), sm: '12px' },
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#e09f00',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            // a finger leaves no pointer behind, so the grow-on-hover effect would only stick on a phone
            transform: { xs: 'none', sm: 'scale(1.05)' },
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        <PlayArrowIcon
          sx={{
            fontSize: { xs: phoneFluid(28, 36), sm: '40px' },
            fill: 'white',
          }}
        />
        Start Learning!
      </Button>
    </Box>
  );
};

export default ChildHomeStartLearning;
