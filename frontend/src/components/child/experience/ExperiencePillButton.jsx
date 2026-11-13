import React from 'react';
import { ButtonBase } from '@mui/material';
import { phoneFluid } from '../../../constants/childPhoneLayout';

/**
 * The round orange or yellow button of the page (the printable, and "Back to home"). With an `href` it is a link that
 * opens in a new tab (the printable); otherwise it is a button.
 *
 * A long label wraps onto a second line instead of running off a narrow phone, and the button is never shorter than a
 * thumb (44px).
 */
const ExperiencePillButton = ({ icon, color, label, href, onClick }) => {
  const linkProps = href ? { component: 'a', href, target: '_blank', rel: 'noopener noreferrer' } : { onClick };

  return (
    <ButtonBase
      {...linkProps}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '9px',
        minHeight: '44px',
        maxWidth: '100%',
        py: { xs: '10px', sm: '13px' },
        px: { xs: phoneFluid(18, 28), sm: '28px' },
        borderRadius: '999px',
        backgroundColor: color,
        color: '#fff',
        fontFamily: 'Quicksand, sans-serif',
        fontWeight: 700,
        fontSize: { xs: phoneFluid(12.5, 13.5), sm: '13.5px' },
        lineHeight: 1.3,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        textAlign: 'center',
        textDecoration: 'none',
        overflowWrap: 'anywhere',
        transition: 'transform 0.15s ease',
        // (a finger leaves no pointer behind, so on phones the lift would only stick)
        '&:hover': { transform: { xs: 'none', sm: 'translateY(-2px)' } },
        '&.Mui-focusVisible': { outline: '3px solid #f2af10', outlineOffset: '3px' },
      }}
    >
      {icon}
      <span>{label}</span>
    </ButtonBase>
  );
};

export default ExperiencePillButton;
