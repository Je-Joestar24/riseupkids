import { createTheme } from '@mui/material/styles';

/**
 * Material UI Theme Configuration
 * 
 * Matches the CSS variables from App.css
 * Uses Quicksand font family
 * Colors: Teal & Orange theme for Rise Up Kids
 */

// Color palette matching CSS variables
const colors = {
  primary: '#62caca',        // --theme-primary
  secondary: '#85c2b9',       // --theme-secondary
  accent: '#f2af10',         // --theme-accent (yellow)
  orange: '#e98a68',         // --theme-orange
  success: '#10b981',        // --theme-success
  warning: '#f2af10',        // --theme-warning
  error: '#ef4444',          // --theme-error
  
  // Background colors
  bgSolid: '#62caca',        // --theme-bg-solid
  bgSecondary: '#f8fafc',    // --theme-bg-secondary
  bgTertiary: '#f1f5f9',     // --theme-bg-tertiary
  bgCard: 'rgba(255, 255, 255, 0.95)',  // --theme-bg-card
  bgOverlay: 'rgba(255, 255, 255, 0.9)', // --theme-bg-overlay
  
  // Text colors
  text: '#0f172a',           // --theme-text
  textSecondary: '#475569',  // --theme-text-secondary
  textMuted: '#64748b',      // --theme-text-muted
  textInverse: '#ffffff',    // --theme-text-inverse
  textTeal: '#62caca',       // --theme-text-teal
  
  // Border colors
  border: '#e2e8f0',         // --theme-border
  borderSecondary: '#cbd5e1', // --theme-border-secondary
  borderAccent: 'rgba(242, 175, 16, 0.3)',  // --theme-border-accent
  borderOrange: 'rgba(233, 138, 104, 0.3)', // --theme-border-orange
  
  // Button colors
  btnYellow: '#f2af10',      // --theme-btn-yellow
  btnTeal: '#62caca',        // --theme-btn-teal
  btnOrange: '#e98a68',      // --theme-btn-orange
};

// Create Material UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      light: colors.secondary,
      dark: '#4a9f9f',
      contrastText: colors.textInverse,
    },
    secondary: {
      main: colors.secondary,
      light: '#a3d4cd',
      dark: '#6a9a93',
      contrastText: colors.textInverse,
    },
    error: {
      main: colors.error,
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: colors.warning,
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      main: colors.success,
      light: '#34d399',
      dark: '#059669',
    },
    info: {
      main: colors.primary,
      light: colors.secondary,
      dark: '#4a9f9f',
    },
    // Custom colors
    accent: {
      main: colors.accent,
      light: '#fbbf24',
      dark: '#d97706',
    },
    orange: {
      main: colors.orange,
      light: '#f0a68a',
      dark: '#d66b47',
    },
    background: {
      default: colors.bgSecondary,
      paper: colors.bgCard,
    },
    text: {
      primary: colors.text,
      secondary: colors.textSecondary,
      disabled: colors.textMuted,
    },
    // Custom background colors
    custom: {
      bgSolid: colors.bgSolid,
      bgSecondary: colors.bgSecondary,
      bgTertiary: colors.bgTertiary,
      bgCard: colors.bgCard,
      bgOverlay: colors.bgOverlay,
      bgGradient: 'linear-gradient(to right bottom, rgb(98, 202, 202), rgb(133, 194, 185), rgb(98, 202, 202))',
      bgOrangeGradient: 'linear-gradient(to right, rgb(233, 138, 104), rgb(233, 138, 104))',
    },
    // Custom text colors
    textCustom: {
      teal: colors.textTeal,
      inverse: colors.textInverse,
    },
    // Custom border colors
    border: {
      main: colors.border,
      secondary: colors.borderSecondary,
      accent: colors.borderAccent,
      orange: colors.borderOrange,
    },
    // Custom button colors
    button: {
      yellow: colors.btnYellow,
      teal: colors.btnTeal,
      orange: colors.btnOrange,
    },
  },
  typography: {
    fontFamily: [
      'Quicksand',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      color: colors.text,
    },
    h2: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      color: colors.text,
    },
    h3: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.4,
      color: colors.text,
    },
    h4: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      color: colors.text,
    },
    h5: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.5,
      color: colors.text,
    },
    h6: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
      color: colors.text,
    },
    body1: {
      fontFamily: 'Quicksand, sans-serif',
      fontSize: '1rem',
      lineHeight: 1.6,
      color: colors.text,
    },
    body2: {
      fontFamily: 'Quicksand, sans-serif',
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: colors.textSecondary,
    },
    button: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 600,
      textTransform: 'none', // Material UI defaults to uppercase, we want normal case
    },
  },
  shape: {
    borderRadius: 8, // Rounded corners for child-friendly design
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',           // --theme-shadow-sm
    '0 4px 6px -1px rgba(0, 0, 0, 0.1)',         // --theme-shadow-md
    '0 10px 15px -3px rgba(0, 0, 0, 0.1)',       // --theme-shadow-lg
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',       // --theme-shadow-xl
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ],
  components: {
    // Button customizations
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
        containedPrimary: {
          backgroundColor: colors.primary,
          color: colors.textInverse,
          '&:hover': {
            backgroundColor: '#4a9f9f',
          },
        },
        containedSecondary: {
          backgroundColor: colors.secondary,
          color: colors.textInverse,
          '&:hover': {
            backgroundColor: '#6a9a93',
          },
        },
      },
      variants: [
        {
          props: { variant: 'accent' },
          style: {
            backgroundColor: colors.accent,
            color: colors.textInverse,
            '&:hover': {
              backgroundColor: '#d97706',
            },
          },
        },
        {
          props: { variant: 'orange' },
          style: {
            backgroundColor: colors.orange,
            color: colors.textInverse,
            '&:hover': {
              backgroundColor: '#d66b47',
            },
          },
        },
      ],
    },
    // Card customizations
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgCard,
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${colors.border}`,
        },
      },
    },
    // TextField customizations
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontFamily: 'Quicksand, sans-serif',
            borderRadius: 8,
            '& fieldset': {
              borderColor: colors.border,
            },
            '&:hover fieldset': {
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
            },
          },
        },
      },
    },
    // Paper customizations
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgCard,
          borderRadius: 12,
        },
      },
    },
    // AppBar customizations
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgCard,
          color: colors.text,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default theme;

