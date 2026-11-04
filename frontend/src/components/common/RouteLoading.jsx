import React from 'react';
import { Backdrop, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useAfterDelay } from '../child/common/ChildSkeleton';

/**
 * Shown while a page's code is downloading. It appears only after a short delay, so a chunk that is
 * already on its way never flashes a spinner.
 */
export const RouteFallback = ({ label = 'Loading page' }) => {
  const visible = useAfterDelay();
  if (!visible) return null;

  return (
    <Box
      role="status"
      aria-busy="true"
      aria-label={label}
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', width: '100%' }}
    >
      <CircularProgress size={48} />
    </Box>
  );
};

/**
 * Shown over the page when a pop-up's code is still downloading after the child opened it. Appears after
 * a short delay, so a download that finishes at once shows nothing.
 */
export const ModalFallback = ({ delayMs = 200 }) => {
  const visible = useAfterDelay(delayMs);
  if (!visible) return null;

  return (
    // The Backdrop itself is hidden from screen readers by MUI, so the announcement sits on a wrapper.
    <Box role="status" aria-busy="true" aria-label="Loading">
      <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}>
        <CircularProgress size={48} sx={{ color: '#fff' }} />
      </Backdrop>
    </Box>
  );
};

/**
 * Catches a page that failed to load (or to render) so the layout around it stays and the child gets a
 * way out. `resetKey` clears the error when the route changes.
 */
export class RouteErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('[RouteErrorBoundary]', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <Box
        role="alert"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          minHeight: '40vh',
          padding: 3,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '1.25rem', fontWeight: 600 }}>
          This page could not load.
        </Typography>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif' }}>
          Please check the connection and try again.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </Box>
    );
  }
}
