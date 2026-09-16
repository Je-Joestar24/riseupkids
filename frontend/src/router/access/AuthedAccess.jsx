import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, CircularProgress, Typography } from '@mui/material';

const ADMIN_TWO_FACTOR_SETUP_PATH = '/admin/setup-2fa';

/**
 * AuthedAccess Component
 *
 * Protects routes that require authentication
 * Redirects to login if not authenticated
 * Shows loading state while checking authentication
 */
const AuthedAccess = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user, twoFactorEnrollmentRequired } = useSelector((state) => state.user);
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '1.25rem' }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // Chunk 10: an admin without TOTP enrolled is blocked from everything except the setup screen
  // itself — this is what "block admin actions until enrolled" means in practice (the backend
  // signals it via twoFactorEnrollmentRequired; enforcement happens here, not per-route, since a
  // hard backend block on every admin endpoint proved far too invasive to retrofit safely).
  if (
    user?.role === 'admin' &&
    twoFactorEnrollmentRequired &&
    location.pathname !== ADMIN_TWO_FACTOR_SETUP_PATH
  ) {
    return <Navigate to={ADMIN_TWO_FACTOR_SETUP_PATH} replace />;
  }

  return children;
};

export default AuthedAccess;

