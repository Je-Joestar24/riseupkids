import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userReducer, { setUser } from '../store/slices/userSlice';
import useContentBasePath from './useContentBasePath';

const basePathFor = (user) => {
  const store = configureStore({ reducer: { user: userReducer } });
  if (user) store.dispatch(setUser(user));
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useContentBasePath(), { wrapper }).result.current;
};

describe('useContentBasePath: the part of the site a page lives in, by role', () => {
  it('is /content-creator for a content creator', () => {
    expect(basePathFor({ role: 'content_creator' })).toBe('/content-creator');
  });

  it('is /teacher for a teacher', () => {
    expect(basePathFor({ role: 'teacher' })).toBe('/teacher');
  });

  it('is /admin for an admin, for anyone else, and for no one', () => {
    expect(basePathFor({ role: 'admin' })).toBe('/admin');
    expect(basePathFor({ role: 'parent' })).toBe('/admin');
    expect(basePathFor(null)).toBe('/admin');
  });

  it('is /admin, and does not break, in a store that has no user part at all', () => {
    const store = configureStore({ reducer: { other: (state = {}) => state } });
    const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

    expect(renderHook(() => useContentBasePath(), { wrapper }).result.current).toBe('/admin');
  });
});
