/**
 * The content creator menu: only the areas an admin gave her, in the usual order, with create and edit pages keeping
 * their area highlighted. What she cannot use is simply not there.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import userReducer, { setUser } from '../../../store/slices/userSlice';
import ContentCreatorSidebar from './ContentCreatorSidebar';

const theme = createTheme({
  palette: {
    orange: { main: 'rgb(233, 138, 104)' },
    border: { main: '#e2e8f0' },
    custom: { bgSecondary: '#f8fafc' },
    textCustom: { inverse: '#ffffff' },
  },
});

let where;
const Where = () => {
  where = useLocation().pathname;
  return null;
};

function mount(user, path = '/content-creator/dashboard') {
  const store = configureStore({ reducer: { user: userReducer } });
  if (user) store.dispatch(setUser(user));
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <ThemeProvider theme={theme}>
          <ContentCreatorSidebar />
          <Where />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );
}

const labels = () => screen.queryAllByRole('button').map((button) => button.getAttribute('aria-label'));
const creator = (accessAreas) => ({ _id: 'c1', role: 'content_creator', accessAreas });

describe('which items she gets', () => {
  it('a creator from before access areas (no list) gets exactly the five items she has today, in today\'s order', () => {
    mount({ _id: 'c1', role: 'content_creator' });

    expect(labels()).toEqual([
      'Navigate to Dashboard',
      'Navigate to My Contents',
      'Navigate to Built-in Books',
      'Navigate to Explore',
      'Navigate to Star Cam Missions',
    ]);
  });

  it('a Notifications-only creator gets one item: Notifications', () => {
    mount(creator(['notifications']), '/content-creator/notifications');

    expect(labels()).toEqual(['Navigate to Notifications']);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('My Contents')).not.toBeInTheDocument();
  });

  it('a creator with Notifications and Experiences gets both, in the usual order', () => {
    mount(creator(['experiences', 'notifications']), '/content-creator/notifications');

    expect(labels()).toEqual(['Navigate to Notifications', 'Navigate to Experiences']);
  });

  it('shows the Dashboard only when she has it', () => {
    mount(creator(['dashboard', 'notifications']));

    expect(labels()).toEqual(['Navigate to Dashboard', 'Navigate to Notifications']);
  });

  it('shows every item for a creator with every area', () => {
    mount(creator(['dashboard', 'contents', 'built_in_books', 'explore', 'star_cam_missions', 'notifications', 'experiences']));

    expect(labels()).toHaveLength(7);
  });

  it('gives every item its own icon, including Notifications and Experiences', () => {
    mount(creator(['dashboard', 'contents', 'built_in_books', 'explore', 'star_cam_missions', 'notifications', 'experiences']));

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(7);
    buttons.forEach((button) => expect(button.querySelector('svg')).not.toBeNull());
  });

  it('shows no items for a creator with no area (and the page around it says so)', () => {
    mount(creator(['retired_area']));

    expect(labels()).toEqual([]);
    expect(screen.getByText('Content Studio')).toBeInTheDocument();
  });

  it('shows no items when there is no user', () => {
    mount(null);

    expect(labels()).toEqual([]);
  });

  it('follows a change of her access straight away (the user in the store changes)', () => {
    const store = configureStore({ reducer: { user: userReducer } });
    store.dispatch(setUser(creator(['explore', 'notifications'])));
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/content-creator/explore']}>
          <ThemeProvider theme={theme}>
            <ContentCreatorSidebar />
          </ThemeProvider>
        </MemoryRouter>
      </Provider>
    );
    expect(labels()).toEqual(['Navigate to Explore', 'Navigate to Notifications']);

    act(() => {
      store.dispatch(setUser(creator(['notifications'])));
    });

    expect(labels()).toEqual(['Navigate to Notifications']);
  });
});

describe('moving around', () => {
  it('goes to the item\'s page when it is clicked', async () => {
    const click = userEvent.setup();
    mount(creator(['dashboard', 'notifications', 'experiences']));

    await click.click(screen.getByRole('button', { name: 'Navigate to Experiences' }));

    expect(where).toBe('/content-creator/experiences');
  });

  it.each([
    ['/content-creator/notifications', 'Navigate to Notifications'],
    ['/content-creator/experiences', 'Navigate to Experiences'],
    ['/content-creator/experiences/create', 'Navigate to Experiences'],
    ['/content-creator/experiences/uuid-1/edit', 'Navigate to Experiences'],
    ['/content-creator/built-in-books/create', 'Navigate to Built-in Books'],
    ['/content-creator/built-in-books/book-1/edit', 'Navigate to Built-in Books'],
  ])('at %s the highlighted item is "%s"', (path, expected) => {
    mount(creator(['notifications', 'experiences', 'built_in_books']), path);
    const items = screen.getAllByRole('button');
    const highlighted = items.filter((button) => getComputedStyle(button).backgroundColor === 'rgb(233, 138, 104)');

    expect(highlighted.map((button) => button.getAttribute('aria-label'))).toEqual([expected]);
  });

  it('highlights nothing on an address that belongs to no area', () => {
    mount(creator(['notifications']), '/content-creator/unknown');
    const highlighted = screen.getAllByRole('button').filter((button) => getComputedStyle(button).backgroundColor === 'rgb(233, 138, 104)');

    expect(highlighted).toEqual([]);
  });

});
