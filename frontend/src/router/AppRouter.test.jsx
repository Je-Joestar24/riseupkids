/**
 * The real router with the real route table and the real lazy loading. Only the page and layout modules
 * are stand-ins, and each records when its code is requested, so the tests can say which areas of the
 * site a visitor downloaded.
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

const probe = vi.hoisted(() => {
  const state = { loads: [], gates: {}, bootstrap: vi.fn(() => ({ type: 'test/bootstrap' })) };
  // A stand-in module: records that its code was requested, waits for its gate (if the test set one),
  // then provides a component that shows its name and the child id it was given.
  state.standIn = (name, extra) => async () => {
    state.loads.push(name);
    if (state.gates[name]) await state.gates[name].promise;
    if (extra?.throws) throw new Error(`${name} could not load`);
    const React = await import('react');
    return {
      default: ({ children, childId }) =>
        React.createElement(
          'div',
          { 'data-testid': name },
          name + (childId ? ` child=${childId}` : ''),
          children
        ),
    };
  };
  return state;
});

vi.mock('../store/slices/userSlice', () => ({
  bootstrapSession: (...args) => probe.bootstrap(...args),
}));

// The stand-ins are registered again before every test: the mock registry remembers a module once it has
// been loaded, so without this only the first test would see which modules were requested.
const registerStandIns = () => {
  vi.doMock('../pages/auth/AuthLogin', async () => {
    probe.loads.push('AuthLogin');
    const React = await import('react');
    return { default: () => React.createElement('div', { 'data-testid': 'AuthLogin' }, 'sign in') };
  });
  vi.doMock('../pages/auth/ResetPassword', probe.standIn('ResetPassword'));
  vi.doMock('../pages/parents/ParentsChild', probe.standIn('ParentsChild'));
  vi.doMock('../pages/parents/ParentsLogin', probe.standIn('ParentsLogin', { throws: true }));
  vi.doMock('../pages/child/ChildHome', probe.standIn('ChildHome'));
  vi.doMock('../pages/child/ChildJourney', probe.standIn('ChildJourney'));
  vi.doMock('../layouts/ChildLayout', probe.standIn('ChildLayout'));
  vi.doMock('../layouts/AdminLayout', probe.standIn('AdminLayout'));
  vi.doMock('../pages/admin/AdminDashboard', probe.standIn('AdminDashboard'));
  vi.doMock('../pages/admin/AdminUsers', probe.standIn('AdminUsers'));
  vi.doMock('../layouts/TeacherLayout', probe.standIn('TeacherLayout'));
  vi.doMock('../pages/teacher/TeacherDashboard', probe.standIn('TeacherDashboard'));
};

// Every test imports a fresh copy of the router (and its page graph), which the first time takes a while.
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const signedOut = { isAuthenticated: false, loading: false, user: null, twoFactorEnrollmentRequired: false };
const signedInAs = (role) => ({
  isAuthenticated: true,
  loading: false,
  user: { role },
  twoFactorEnrollmentRequired: false,
});

/** A fresh copy of the app, so each test starts with nothing downloaded. */
async function open(path, userState) {
  vi.resetModules();
  registerStandIns();
  probe.loads.length = 0;
  probe.bootstrap.mockClear();
  window.history.pushState({}, '', path);

  const { default: AppRouter } = await import('./AppRouter');
  const store = configureStore({ reducer: { user: (state = userState) => state } });

  const view = render(
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
  await act(async () => {});
  return view;
}

const downloaded = () => [...probe.loads];

beforeEach(() => {
  probe.gates = {};
  probe.loads.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  window.history.pushState({}, '', '/');
});

describe('what a visitor downloads', () => {
  it('a signed-out visitor gets the sign-in page and nothing else', async () => {
    await open('/login', signedOut);

    expect(screen.getByTestId('AuthLogin')).toBeInTheDocument();
    expect(downloaded()).toEqual(['AuthLogin']);
  });

  it('the front page is the sign-in page', async () => {
    await open('/', signedOut);
    expect(screen.getByTestId('AuthLogin')).toBeInTheDocument();
  });

  it('a signed-out visitor sent to a child page is turned away without downloading the child area', async () => {
    await open('/child/kid1/home', signedOut);

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByTestId('AuthLogin')).toBeInTheDocument();
    expect(downloaded()).not.toContain('ChildHome');
    expect(downloaded()).not.toContain('ChildLayout');
  });

  it('a parent opening a child page gets the child area and not the admin area', async () => {
    await open('/child/kid1/home', signedInAs('parent'));

    expect(await screen.findByTestId('ChildHome')).toHaveTextContent('child=kid1');
    expect(screen.getByTestId('ChildLayout')).toBeInTheDocument();
    expect(downloaded()).toEqual(expect.arrayContaining(['ChildLayout', 'ChildHome']));
    expect(downloaded().some((name) => name.startsWith('Admin') || name.startsWith('Teacher'))).toBe(false);
  });

  it('a parent sent to an admin page is turned away to their own area without downloading the admin area', async () => {
    await open('/admin/dashboard', signedInAs('parent'));

    // Turned away to the sign-in page, which sends a signed-in parent on to the child picker.
    expect(await screen.findByTestId('ParentsChild')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parents/child');
    expect(downloaded()).not.toContain('AdminLayout');
    expect(downloaded()).not.toContain('AdminDashboard');
  });

  it('a teacher sent to the admin-only dashboard is turned away', async () => {
    await open('/admin/dashboard', signedInAs('teacher'));

    expect(await screen.findByTestId('TeacherDashboard')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/teacher/dashboard');
    expect(downloaded()).not.toContain('AdminDashboard');
    expect(downloaded()).not.toContain('AdminLayout');
  });

  it('an admin gets the admin layout and page, without any child code', async () => {
    await open('/admin/dashboard', signedInAs('admin'));

    expect(await screen.findByTestId('AdminDashboard')).toBeInTheDocument();
    expect(screen.getByTestId('AdminLayout')).toContainElement(screen.getByTestId('AdminDashboard'));
    expect(downloaded().some((name) => name.startsWith('Child'))).toBe(false);
  });

  it('a teacher gets the teacher area', async () => {
    await open('/teacher/dashboard', signedInAs('teacher'));

    expect(await screen.findByTestId('TeacherDashboard')).toBeInTheDocument();
    expect(screen.getByTestId('TeacherLayout')).toContainElement(screen.getByTestId('TeacherDashboard'));
  });

  it('keeps the old redirect from the teachers address to the users page', async () => {
    await open('/admin/teachers', signedInAs('admin'));

    expect(await screen.findByTestId('AdminUsers')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/users');
  });

  it('a signed-out visitor can reach a public page that is downloaded on demand', async () => {
    await open('/reset-password', signedOut);
    expect(await screen.findByTestId('ResetPassword')).toBeInTheDocument();
  });
});

describe('downloading side by side', () => {
  it('asks for the layout and the page at the same moment, not the page after the layout', async () => {
    probe.gates.AdminLayout = deferred();
    probe.gates.AdminDashboard = deferred();

    // Neither has arrived, yet both have been asked for.
    await open('/admin/dashboard', signedInAs('admin'));
    await waitFor(() => expect(downloaded()).toEqual(expect.arrayContaining(['AdminLayout', 'AdminDashboard'])));
    expect(screen.queryByTestId('AdminDashboard')).not.toBeInTheDocument();

    await act(async () => {
      probe.gates.AdminLayout.resolve();
      probe.gates.AdminDashboard.resolve();
    });
    expect(await screen.findByTestId('AdminDashboard')).toBeInTheDocument();
  });

  it('asks for the child frame and the page at the same moment', async () => {
    probe.gates.ChildLayout = deferred();
    probe.gates.ChildHome = deferred();

    await open('/child/kid1/home', signedInAs('parent'));
    await waitFor(() => expect(downloaded()).toEqual(expect.arrayContaining(['ChildHome'])));
    expect(screen.queryByTestId('ChildHome')).not.toBeInTheDocument();

    await act(async () => {
      probe.gates.ChildLayout.resolve();
      probe.gates.ChildHome.resolve();
    });
    expect(await screen.findByTestId('ChildHome')).toBeInTheDocument();
  });
});

describe('moving around inside a signed-in area', () => {
  it('keeps the admin layout on screen while the next admin page downloads', async () => {
    await open('/admin/dashboard', signedInAs('admin'));
    expect(await screen.findByTestId('AdminDashboard')).toBeInTheDocument();
    const layout = screen.getByTestId('AdminLayout');

    probe.gates.AdminUsers = deferred();
    await act(async () => {
      window.history.pushState({}, '', '/admin/users');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByTestId('AdminLayout')).toBe(layout);
    expect(layout).toBeVisible();

    await act(async () => {
      probe.gates.AdminUsers.resolve();
    });
    expect(await screen.findByTestId('AdminUsers')).toBeInTheDocument();
    expect(screen.getByTestId('AdminLayout')).toBe(layout);
  });
});

describe('warming the child area', () => {
  it('starts it while a parent is choosing a child, once the browser is idle', async () => {
    await open('/parents/child', signedInAs('parent'));

    expect(await screen.findByTestId('ParentsChild')).toBeInTheDocument();
    expect(downloaded()).not.toContain('ChildHome');

    // Once the browser is idle (about half a second here) the child area is fetched.
    await waitFor(() => expect(downloaded()).toEqual(expect.arrayContaining(['ChildHome'])), { timeout: 4000 });
    expect(downloaded().some((name) => name.startsWith('Admin'))).toBe(false);
  });
});

describe('when a page cannot load', () => {
  it('shows a message with Try again instead of a blank screen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await open('/parents/login', signedInAs('parent'));

    expect(await screen.findByRole('alert')).toHaveTextContent('This page could not load.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('the session check', () => {
  it('still runs once when the site opens', async () => {
    await open('/login', signedOut);
    expect(probe.bootstrap).toHaveBeenCalledTimes(1);
  });
});
