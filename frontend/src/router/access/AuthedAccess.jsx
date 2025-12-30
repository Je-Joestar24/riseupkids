import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * AuthedAccess Component
 * 
 * Protects routes that require authentication
 * Redirects to login if not authenticated
 * Shows loading state while checking authentication
 */
const AuthedAccess = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useSelector((state) => state.user);

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

  return children;
};

export default AuthedAccess;

