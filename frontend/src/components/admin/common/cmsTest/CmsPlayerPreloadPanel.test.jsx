import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import CmsPlayerPreloadPanel from './CmsPlayerPreloadPanel';

const show = (props) =>
  render(
    <ThemeProvider theme={theme}>
      <CmsPlayerPreloadPanel {...props} />
    </ThemeProvider>
  );

describe('Book wait panel', () => {
  it('keeps its usual look by default: title, a measured bar and the percentage', () => {
    show({ preloadProgress: 42 });

    expect(screen.getByText('Loading all content...')).toBeInTheDocument();
    expect(screen.getByText('Preparing media for smooth playback. Please wait.')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Media preload progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar.className).toContain('MuiLinearProgress-determinate');
    expect(screen.getByText('42% loaded')).toBeInTheDocument();
  });

  it('keeps the percentage inside 0 to 100', () => {
    show({ preloadProgress: 250 });
    expect(screen.getByText('100% loaded')).toBeInTheDocument();
  });

  it('shows a moving bar and no percentage while there is nothing to measure yet', () => {
    show({ indeterminate: true, title: 'Opening your book...', subtitle: 'Getting the pages ready. Please wait.' });

    expect(screen.getByText('Opening your book...')).toBeInTheDocument();
    expect(screen.getByText('Getting the pages ready. Please wait.')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Opening the book' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar.className).toContain('MuiLinearProgress-indeterminate');
    expect(screen.queryByText(/% loaded/)).toBeNull();
  });

  it('still reports that some files could not be preloaded', () => {
    show({ preloadProgress: 80, preloadSummary: { failed: ['a.mp3'] } });
    expect(screen.getByText(/Some files could not be preloaded/)).toBeInTheDocument();
  });
});
