/**
 * The "Experiences" item in the admin sidebar: where it sits, that it leads to the page, that it stays
 * highlighted on the pages under it (the future add / edit pages), and that it does not disturb the other items.
 */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import AdminSidebar from './AdminSidebar';

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderAt = (path) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <AdminSidebar />
        <Where />
      </MemoryRouter>
    </ThemeProvider>
  );

const item = (name) => screen.getByRole('button', { name });
const isHighlighted = (name) => getComputedStyle(item(name)).backgroundColor === 'rgb(233, 138, 104)';

afterEach(() => cleanup());

describe('the Experiences item', () => {
  it('is in the menu, right below Courses and above Check Audio', () => {
    renderAt('/admin/dashboard');
    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    const courses = labels.indexOf('Courses');
    expect(courses).toBeGreaterThan(-1);
    expect(labels[courses + 1]).toBe('Experiences');
    expect(labels[courses + 2]).toBe('Check Audio');
  });

  it('opens the Experiences page', async () => {
    const user = userEvent.setup();
    renderAt('/admin/dashboard');
    await user.click(item('Experiences'));
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/experiences');
  });

  it('is highlighted on its page, and only there among the items', () => {
    renderAt('/admin/experiences');
    expect(isHighlighted('Experiences')).toBe(true);
    expect(isHighlighted('Dashboard')).toBe(false);
    expect(isHighlighted('Users')).toBe(false);
    expect(isHighlighted('Courses')).toBe(false);
  });

  it('stays highlighted on the pages under it (the add and edit pages that come later)', () => {
    renderAt('/admin/experiences/create');
    expect(isHighlighted('Experiences')).toBe(true);
    cleanup();
    renderAt('/admin/experiences/3b241101-e2bb-4255-8caf-4136c566a962/edit');
    expect(isHighlighted('Experiences')).toBe(true);
  });

  it('is not highlighted on a page that only starts with the same letters', () => {
    renderAt('/admin/experiencesabc');
    expect(isHighlighted('Experiences')).toBe(false);
  });

  it('is not highlighted on the other pages, including Explore under Courses', () => {
    renderAt('/admin/courses/explore');
    expect(isHighlighted('Experiences')).toBe(false);
    cleanup();
    renderAt('/admin/dashboard');
    expect(isHighlighted('Experiences')).toBe(false);
    expect(isHighlighted('Dashboard')).toBe(true);
  });

  it('does not change how the other items are highlighted', () => {
    renderAt('/admin/printables');
    expect(isHighlighted('Printables')).toBe(true);
    expect(isHighlighted('Experiences')).toBe(false);
    cleanup();
    renderAt('/admin/built-in-books/create'); // a page under an item that does NOT stay highlighted (as before)
    expect(isHighlighted('Built-in Books')).toBe(false);
  });
});
