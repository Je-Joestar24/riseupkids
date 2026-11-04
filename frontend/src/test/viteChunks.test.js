// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { manualChunkFor } from '../../vite.config.js';

/**
 * The shared-library files of the production build. Only libraries every visitor needs may be grouped:
 * a library that only some areas use (the UI kit's less common parts, drag-and-drop, payments) must stay
 * with the pages that need it, or every child would download it.
 */
const module_ = (name, file = 'index.js') => `D:/app/frontend/node_modules/${name}/${file}`;

describe('manualChunkFor', () => {
  it.each([
    ['react'],
    ['react-dom'],
    ['scheduler'],
    ['react-router'],
    ['react-router-dom'],
    ['@remix-run/router'],
  ])('puts %s in the React file', (name) => {
    expect(manualChunkFor(module_(name))).toBe('vendor-react');
  });

  it.each([
    ['@reduxjs/toolkit'],
    ['react-redux'],
    ['redux'],
    ['redux-thunk'],
    ['immer'],
    ['reselect'],
    ['use-sync-external-store'],
  ])('puts %s in the state file', (name) => {
    expect(manualChunkFor(module_(name))).toBe('vendor-state');
  });

  it.each([
    ['@mui/material'],
    ['@mui/icons-material'],
    ['@emotion/react'],
    ['@dnd-kit/core'],
    ['@dnd-kit/sortable'],
    ['@stripe/stripe-js'],
    ['axios'],
  ])('leaves %s to the pages that use it', (name) => {
    expect(manualChunkFor(module_(name))).toBeUndefined();
  });

  it('does not mistake a package whose name merely starts like another', () => {
    expect(manualChunkFor(module_('react-transition-group'))).toBeUndefined();
    expect(manualChunkFor(module_('react-is'))).toBeUndefined();
    expect(manualChunkFor(module_('redux-logger'))).toBeUndefined();
  });

  it('ignores the app’s own source', () => {
    expect(manualChunkFor('D:/app/frontend/src/pages/child/ChildHome.jsx')).toBeUndefined();
    expect(manualChunkFor('D:/app/frontend/src/react/helpers.js')).toBeUndefined();
  });
});
