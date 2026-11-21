/**
 * The Users page for content creator access, end to end: the real page, table, dialogs, hook and store; only the
 * server calls (the service) are stood in. What an admin sees and can do:
 *   Add (two steps for a creator), Edit (the checkboxes), View (read only), the Access column, Manage access
 *   (one creator, or several together), and what happens when the server refuses.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../services/adminUsersService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      getUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      archiveUser: vi.fn(),
      restoreUser: vi.fn(),
      getAccessAreas: vi.fn(),
      setCreatorAccess: vi.fn(),
      setCreatorAccessBulk: vi.fn(),
    },
  };
});

import service, { AdminUserApiError } from '../../../services/adminUsersService';
import theme from '../../../config/theme';
import parentsReducer, { setFilters } from '../../../store/slices/parentsSlice';
import uiReducer from '../../../store/slices/uiSlice';
import AdminUsers from '../../../pages/admin/AdminUsers';
import AdminDialogBox from '../../common/AdminDialogBox';

// Several dialogs open and close in each test; give the waits room on a busy machine
vi.setConfig({ testTimeout: 30000 });
configure({ asyncUtilTimeout: 6000 });

const OPTIONS = {
  areas: [
    { key: 'dashboard', label: 'Dashboard', help: 'The home page with shortcuts', legacy: true },
    { key: 'contents', label: 'Contents', help: 'Activities, videos, chants and books', legacy: true },
    { key: 'built_in_books', label: 'Built-in Books', help: 'Build the built-in books', legacy: true },
    { key: 'explore', label: 'Explore', help: 'Explore videos', legacy: true },
    { key: 'star_cam_missions', label: 'Star Cam Missions', help: 'Missions', legacy: true },
    { key: 'notifications', label: 'Notifications', help: 'Create, test and send push notifications', legacy: false },
    { key: 'experiences', label: 'Experiences', help: 'Manage Experiences', legacy: false },
  ],
  legacyAreas: ['dashboard', 'contents', 'built_in_books', 'explore', 'star_cam_missions'],
};
const LEGACY = OPTIONS.legacyAreas;
const ALL = OPTIONS.areas.map((area) => area.key);

const creator = (id, name, accessAreas, extra = {}) => ({
  _id: id,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@example.com`,
  role: 'content_creator',
  isActive: true,
  accessAreas,
  ...extra,
});

let rows;
let store;
const PAGINATION = { currentPage: 1, totalPages: 1, totalItems: 3, itemsPerPage: 10, hasNextPage: false, hasPrevPage: false };

const user = () => userEvent.setup();

function mount({ role = 'content_creator', list = rows } = {}) {
  rows = list;
  store = configureStore({ reducer: { parents: parentsReducer, ui: uiReducer } });
  store.dispatch(setFilters({ role }));
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AdminUsers />
          <AdminDialogBox />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

const table = () => screen.findByRole('table');
const rowOf = async (name) => within(await table()).getByText(name).closest('tr');
// hidden: true because a notice (shown as a dialog by the app) may be open on top of the dialog being checked
const ticked = (root = screen) => root.getAllByRole('checkbox', { hidden: true }).filter((item) => item.checked).map((item) => item.getAttribute('aria-label'));
const notice = () => store.getState().ui.notification;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  rows = [creator('c1', 'Pat Lee', LEGACY), creator('c2', 'Sam Roe', ['notifications']), creator('c3', 'Kim Wu', ALL)];
  service.getUsers.mockImplementation(async () => ({ data: rows, pagination: PAGINATION }));
  service.getUserById.mockImplementation(async (id) => ({ data: rows.find((row) => row._id === id) }));
  service.getAccessAreas.mockResolvedValue(OPTIONS);
});

// ---------------------------------------------------------------- the Access column

describe('the Access column (Content Creators filter)', () => {
  it('shows what each creator can use: a few labels and "+N", or "All areas"', async () => {
    mount();

    const pat = await rowOf('Pat Lee');
    expect(within(pat).getByText('Dashboard')).toBeInTheDocument();
    expect(within(pat).getByText('Contents')).toBeInTheDocument();
    expect(within(pat).getByText('+3')).toBeInTheDocument();
    expect(within(await rowOf('Sam Roe')).getByText('Notifications')).toBeInTheDocument();
    expect(within(await rowOf('Kim Wu')).getByText('All areas')).toBeInTheDocument();
  });

  it('has an Access column header, and not for parents', async () => {
    mount();
    expect(within(await table()).getByRole('columnheader', { name: 'Access' })).toBeInTheDocument();
    cleanup();

    mount({ role: 'parent', list: [{ _id: 'p1', name: 'Pia Park', email: 'pia@example.com', role: 'parent', isActive: true, childProfilesCount: 1 }] });
    await screen.findByText('Pia Park');
    expect(screen.queryByRole('columnheader', { name: 'Access' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Manage access for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows a plain count while the checkbox names are not loaded yet', async () => {
    service.getAccessAreas.mockReturnValue(new Promise(() => {}));
    mount();

    expect(within(await rowOf('Sam Roe')).getByText('1 area')).toBeInTheDocument();
    expect(within(await rowOf('Pat Lee')).getByText('5 areas')).toBeInTheDocument();
  });

  it('every creator row has Manage access, with her name', async () => {
    mount();
    await table();

    expect(screen.getByRole('button', { name: 'Manage access for Pat Lee' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage access for Sam Roe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage access for Kim Wu' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- manage access: one creator

describe('Manage access from the list', () => {
  it('opens with her ticks, and a reduction asks first, then saves and updates her row without reloading', async () => {
    service.setCreatorAccess.mockResolvedValue({ data: creator('c1', 'Pat Lee', ['dashboard', 'contents', 'built_in_books', 'star_cam_missions']), changed: true });
    mount();
    await table();

    await user().click(screen.getByRole('button', { name: 'Manage access for Pat Lee' }));
    const dialog = await screen.findByRole('dialog', { name: 'Manage access: Pat Lee' });
    expect(ticked(within(dialog))).toEqual(['Dashboard', 'Contents', 'Built-in Books', 'Explore', 'Star Cam Missions']);

    await user().click(within(dialog).getByRole('checkbox', { name: 'Explore' }));
    expect(within(dialog).getByText('Will be removed')).toBeInTheDocument();
    await user().click(within(dialog).getByRole('button', { name: 'Save access' }));
    expect(within(dialog).getByText('Pat Lee will lose access to Explore straight away.')).toBeInTheDocument();
    expect(service.setCreatorAccess).not.toHaveBeenCalled();

    await user().click(within(dialog).getByRole('button', { name: 'Yes, remove access' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Manage access: Pat Lee' })).not.toBeInTheDocument());
    expect(service.setCreatorAccess).toHaveBeenCalledWith('c1', ['dashboard', 'contents', 'built_in_books', 'star_cam_missions']);
    expect(notice().message).toBe('Access updated successfully');
    // Her row shows the new list straight away, from the server's answer
    expect(within(await rowOf('Pat Lee')).getByText('+2')).toBeInTheDocument();
  });

  it('a refusal stays inside the dialog', async () => {
    service.setCreatorAccess.mockRejectedValue(new AdminUserApiError('This content creator could not be found. They may have been removed.', { status: 404, code: 'CONTENT_CREATOR_NOT_FOUND' }));
    mount();
    await table();
    await user().click(screen.getByRole('button', { name: 'Manage access for Sam Roe' }));
    const dialog = await screen.findByRole('dialog', { name: 'Manage access: Sam Roe' });

    await user().click(within(dialog).getByRole('checkbox', { name: 'Experiences' }));
    await user().click(within(dialog).getByRole('button', { name: 'Save access' }));

    expect(await within(dialog).findByText(/could not be found/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Manage access: Sam Roe' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- manage access: several

describe('Manage access for several creators', () => {
  it('has no selection bar until someone is ticked, and counts the ticked', async () => {
    mount();
    await table();
    expect(screen.queryByRole('region', { name: 'Selected content creators' })).not.toBeInTheDocument();

    await user().click(screen.getByRole('checkbox', { name: 'Select Pat Lee' }));
    await user().click(screen.getByRole('checkbox', { name: 'Select Sam Roe' }));

    const bar = screen.getByRole('region', { name: 'Selected content creators' });
    expect(within(bar).getByText('2 selected')).toBeInTheDocument();
  });

  it('the header box ticks and unticks everyone on the page', async () => {
    mount();
    await table();

    await user().click(screen.getByRole('checkbox', { name: 'Select all content creators on this page' }));
    expect(screen.getByText('3 selected')).toBeInTheDocument();

    await user().click(screen.getByRole('checkbox', { name: 'Select all content creators on this page' }));
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });

  it('Clear selection unticks everyone', async () => {
    mount();
    await table();
    await user().click(screen.getByRole('checkbox', { name: 'Select Pat Lee' }));

    await user().click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(screen.getByRole('checkbox', { name: 'Select Pat Lee' })).not.toBeChecked();
  });

  it('gives the ticked creators one list, after asking, and clears the selection', async () => {
    service.setCreatorAccessBulk.mockResolvedValue({
      message: 'Access updated for 2 people',
      data: [
        { id: 'c1', name: 'Pat Lee', accessAreas: ['notifications'], changed: true },
        { id: 'c3', name: 'Kim Wu', accessAreas: ['notifications'], changed: true },
      ],
      matched: 2,
      changed: 2,
    });
    mount();
    await table();
    await user().click(screen.getByRole('checkbox', { name: 'Select Pat Lee' }));
    await user().click(screen.getByRole('checkbox', { name: 'Select Kim Wu' }));
    await user().click(screen.getByRole('button', { name: 'Manage access' }));
    const dialog = await screen.findByRole('dialog', { name: 'Manage access: 2 people' });

    // Pat and Kim have these in common
    expect(ticked(within(dialog))).toEqual(['Dashboard', 'Contents', 'Built-in Books', 'Explore', 'Star Cam Missions']);
    await user().click(within(dialog).getByRole('button', { name: 'Clear' }));
    await user().click(within(dialog).getByRole('checkbox', { name: 'Notifications' }));
    await user().click(within(dialog).getByRole('button', { name: 'Save access' }));
    expect(within(dialog).getByText(/2 people will lose access to/)).toBeInTheDocument();
    await user().click(within(dialog).getByRole('button', { name: 'Yes, remove access' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Manage access: 2 people' })).not.toBeInTheDocument());
    expect(service.setCreatorAccessBulk).toHaveBeenCalledWith(['c1', 'c3'], ['notifications']);
    expect(notice().message).toBe('Access updated for 2 people');
    // (hidden: true so a page still covered by the closing dialog cannot make these pass by being invisible)
    expect(screen.queryByRole('region', { name: 'Selected content creators', hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Pat Lee', hidden: true })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Kim Wu', hidden: true })).not.toBeChecked();
    expect(within(await rowOf('Pat Lee')).getByText('Notifications')).toBeInTheDocument();
    expect(within(await rowOf('Kim Wu')).getByText('Notifications')).toBeInTheDocument();
    // The creator who was not ticked is untouched
    expect(within(await rowOf('Sam Roe')).getByText('Notifications')).toBeInTheDocument();
  });

  it('one ticked creator opens the single-person dialog', async () => {
    mount();
    await table();
    await user().click(screen.getByRole('checkbox', { name: 'Select Sam Roe' }));

    await user().click(screen.getByRole('button', { name: 'Manage access' }));

    expect(await screen.findByRole('dialog', { name: 'Manage access: Sam Roe' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- add user

const chooseRole = async (label) => {
  await user().click(screen.getByRole('combobox'));
  await user().click(await screen.findByRole('option', { name: label }));
};
const type = async (label, text) => user().type(screen.getByLabelText(new RegExp(`^${label}`)), text);
const fillDetails = async () => {
  await type('Name', 'New Person');
  await type('Email', 'new@example.com');
  await type('Password', 'secret123');
};
const openAdd = async () => {
  await table();
  await user().click(screen.getByRole('button', { name: 'Add User' }));
  return screen.findByRole('dialog', { name: 'Add New User' });
};

describe('Add User: a parent or a teacher is still one step', () => {
  it('says "Create User" and creates straight away', async () => {
    service.createUser.mockResolvedValue({ data: { _id: 'p9', name: 'New Person', role: 'parent' } });
    mount();
    await openAdd();

    await fillDetails();
    expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument();
    await user().click(screen.getByRole('button', { name: 'Create User' }));

    await waitFor(() => expect(service.createUser).toHaveBeenCalledTimes(1));
    expect(service.createUser.mock.calls[0][0]).toEqual(expect.objectContaining({ role: 'parent', name: 'New Person', email: 'new@example.com', password: 'secret123' }));
    expect(screen.queryByText(/Choose what/)).not.toBeInTheDocument();
  });
});

describe('Add User: a content creator has a second step', () => {
  it('the first step says "Next", and does not move on while the details are empty or wrong', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');

    // Empty: the browser's own required-field check stops it
    await user().click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByText(/Choose what/)).not.toBeInTheDocument();

    // A password that is too short is caught by the form itself
    await type('Name', 'New Person');
    await type('Email', 'new@example.com');
    await type('Password', 'abc');
    await user().click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(screen.queryByText(/Choose what/)).not.toBeInTheDocument();
    expect(service.createUser).not.toHaveBeenCalled();
  });

  it('Next shows "Choose what [name] can use" with every checkbox, none ticked, and Create disabled', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();

    await user().click(screen.getByRole('button', { name: 'Next' }));

    const dialog = await screen.findByRole('dialog', { name: 'Choose what New Person can use' });
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7);
    expect(ticked(within(dialog))).toEqual([]);
    expect(within(dialog).getByText('Create, test and send push notifications')).toBeInTheDocument();
    expect(within(dialog).getByText('Choose at least one area.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create User' })).toBeDisabled();
    expect(service.createUser).not.toHaveBeenCalled();
  });

  it('submitting the form with nothing ticked (Enter on a checkbox) creates nobody', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    const dialog = await screen.findByRole('dialog', { name: 'Choose what New Person can use' });

    // The button is disabled, but a form can also be submitted from the keyboard
    fireEvent.submit(dialog.querySelector('form'));

    expect(service.createUser).not.toHaveBeenCalled();
    expect(within(dialog).getByText('Choose at least one area.')).toBeInTheDocument();
  });

  it('closing on the access step and opening Add User again starts clean on the first step', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    const dialog = await screen.findByRole('dialog', { name: 'Choose what New Person can use' });
    await user().click(within(dialog).getByRole('checkbox', { name: 'Notifications' }));

    await user().click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Choose what/ })).not.toBeInTheDocument());
    await openAdd();

    const again = await screen.findByRole('dialog', { name: 'Add New User' });
    expect(within(again).queryByText(/Choose what/)).not.toBeInTheDocument();
    expect(within(again).getByLabelText(/Name/)).toHaveValue('');

    // And the Notifications tick from before is gone
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    const second = await screen.findByRole('dialog', { name: 'Choose what New Person can use' });
    expect(ticked(within(second))).toEqual([]);
    expect(service.createUser).not.toHaveBeenCalled();
  });

  it('Select all and Clear work, and ticking one enables Create User', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    const dialog = await screen.findByRole('dialog', { name: 'Choose what New Person can use' });

    await user().click(within(dialog).getByRole('button', { name: 'Select all' }));
    expect(ticked(within(dialog))).toHaveLength(7);
    await user().click(within(dialog).getByRole('button', { name: 'Clear' }));
    expect(ticked(within(dialog))).toEqual([]);
    await user().click(within(dialog).getByRole('checkbox', { name: 'Notifications' }));

    expect(within(dialog).getByRole('button', { name: 'Create User' })).toBeEnabled();
    expect(within(dialog).queryByText('Choose at least one area.')).not.toBeInTheDocument();
  });

  it('Back keeps what was typed and what was ticked', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    await user().click(await screen.findByRole('checkbox', { name: 'Experiences' }));

    await user().click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('dialog', { name: 'Add New User' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('New Person');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('new@example.com');
    await user().click(screen.getByRole('button', { name: 'Next' }));
    expect(ticked(await screen.findByRole('dialog', { name: 'Choose what New Person can use' }) && screen)).toContain('Experiences');
  });

  it('Create User sends the details with exactly the ticked areas, closes, and shows the new creator', async () => {
    service.createUser.mockResolvedValue({ data: creator('c9', 'New Person', ['notifications', 'experiences']) });
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    await user().click(await screen.findByRole('checkbox', { name: 'Experiences' }));
    await user().click(screen.getByRole('checkbox', { name: 'Notifications' }));

    await user().click(screen.getByRole('button', { name: 'Create User' }));

    await waitFor(() => expect(service.createUser).toHaveBeenCalledTimes(1));
    expect(service.createUser).toHaveBeenCalledWith({
      role: 'content_creator',
      name: 'New Person',
      email: 'new@example.com',
      password: 'secret123',
      accessAreas: ['notifications', 'experiences'],
    });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Choose what/ })).not.toBeInTheDocument());
    expect(notice().message).toBe('Content Creator created successfully!');
    expect(store.getState().parents.filters.role).toBe('content_creator');
  });

  it('an email that is already used sends the admin back to the first step, with the reason on the email', async () => {
    service.createUser.mockRejectedValue(new AdminUserApiError('User already exists with this email', { status: 409 }));
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    await user().click(await screen.findByRole('checkbox', { name: 'Notifications' }));

    await user().click(screen.getByRole('button', { name: 'Create User' }));

    expect(await screen.findByText('User already exists with this email')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add New User' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveValue('new@example.com');
  });

  it('a refused list shows the reason on the second step, and keeps the ticks', async () => {
    service.createUser.mockRejectedValue(new AdminUserApiError('Unknown area: billing.', { status: 400, code: 'ACCESS_AREAS_INVALID' }));
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    await user().click(await screen.findByRole('checkbox', { name: 'Notifications' }));

    await user().click(screen.getByRole('button', { name: 'Create User' }));

    const dialog = await screen.findByRole('dialog', { name: 'Choose what New Person can use' });
    expect(await within(dialog).findAllByText('Unknown area: billing.')).not.toHaveLength(0);
    expect(ticked(within(dialog))).toEqual(['Notifications']);
  });

  it('while it creates, the buttons are disabled and say so', async () => {
    let resolve;
    service.createUser.mockReturnValue(new Promise((r) => { resolve = r; }));
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    await user().click(await screen.findByRole('checkbox', { name: 'Notifications' }));
    await user().click(screen.getByRole('button', { name: 'Create User' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    resolve({ data: creator('c9', 'New Person', ['notifications']) });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Choose what/ })).not.toBeInTheDocument());
  });

  it('closing and opening again starts from the first step with nothing typed or ticked', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();
    await user().click(screen.getByRole('button', { name: 'Next' }));
    await user().click(await screen.findByRole('checkbox', { name: 'Notifications' }));

    await user().click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user().click(screen.getByRole('button', { name: 'Add User' }));

    const dialog = await screen.findByRole('dialog', { name: 'Add New User' });
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('');
  });

  it('if the checkboxes cannot be loaded it says why, offers Retry, and Create stays off', async () => {
    // The list behind the dialog asks for them too, so the server fails every time until the connection is back
    service.getAccessAreas.mockRejectedValue(new AdminUserApiError('Could not reach the server. Check your connection and try again.'));
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    await fillDetails();

    await user().click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findAllByText(/Could not reach the server/)).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Create User' })).toBeDisabled();
    expect(notice().open).toBe(false);

    service.getAccessAreas.mockResolvedValue(OPTIONS);
    await user().click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findAllByRole('checkbox')).toHaveLength(7);
  });

  it('changing the role back to Parent on the first step makes it one step again', async () => {
    mount();
    await openAdd();
    await chooseRole('Content Creator');
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();

    await chooseRole('Parent');

    expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- edit

const openEdit = async (name) => {
  await table();
  const row = await rowOf(name);
  await user().click(within(row).getByRole('button', { name: 'Edit user' }));
  return screen.findByRole('dialog', { name: /Edit User/ }).catch(() => screen.findByRole('dialog'));
};

describe('Edit a content creator', () => {
  it('shows the checkboxes with her ticks, and a note that changes apply on her next page', async () => {
    mount();
    const dialog = await openEdit('Sam Roe');

    await waitFor(() => expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7));
    expect(ticked(within(dialog))).toEqual(['Notifications']);
    expect(within(dialog).getByText('Changes apply the next time they open a page.')).toBeInTheDocument();
  });

  it('editing only the name does NOT send her access (so a creator from before keeps no saved list)', async () => {
    service.updateUser.mockResolvedValue({ data: creator('c1', 'Pat Renamed', LEGACY) });
    mount();
    const dialog = await openEdit('Pat Lee');
    await waitFor(() => expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7));
    const name = within(dialog).getByLabelText(/^Name/);

    await user().clear(name);
    await user().type(name, 'Pat Renamed');
    await user().click(within(dialog).getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(service.updateUser).toHaveBeenCalledTimes(1));
    const [, , payload] = service.updateUser.mock.calls[0];
    expect(payload).toEqual(expect.objectContaining({ name: 'Pat Renamed' }));
    expect(payload).not.toHaveProperty('accessAreas');
  });

  it('adding an area sends her whole new list, with no question', async () => {
    service.updateUser.mockResolvedValue({ data: creator('c2', 'Sam Roe', ['notifications', 'experiences']) });
    mount();
    const dialog = await openEdit('Sam Roe');
    await waitFor(() => expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7));

    await user().click(within(dialog).getByRole('checkbox', { name: 'Experiences' }));
    expect(within(dialog).getByText('Will be added')).toBeInTheDocument();
    await user().click(within(dialog).getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(service.updateUser).toHaveBeenCalledTimes(1));
    expect(service.updateUser.mock.calls[0][2]).toEqual(expect.objectContaining({ accessAreas: ['notifications', 'experiences'] }));
  });

  it('taking an area away asks first, naming it, and saves only after "Confirm"', async () => {
    service.updateUser.mockResolvedValue({ data: creator('c1', 'Pat Lee', ['dashboard', 'contents', 'built_in_books', 'star_cam_missions']) });
    mount();
    const dialog = await openEdit('Pat Lee');
    await waitFor(() => expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7));

    await user().click(within(dialog).getByRole('checkbox', { name: 'Explore' }));
    expect(within(dialog).getByText('Will be removed')).toBeInTheDocument();
    await user().click(within(dialog).getByRole('button', { name: 'Update' }));

    expect(await screen.findByText(/Pat Lee will lose access to Explore straight away\./)).toBeInTheDocument();
    expect(service.updateUser).not.toHaveBeenCalled();
    await user().click(screen.getByRole('button', { name: /Confirm/ }));

    await waitFor(() => expect(service.updateUser).toHaveBeenCalledTimes(1));
    expect(service.updateUser.mock.calls[0][2].accessAreas).toEqual(['dashboard', 'contents', 'built_in_books', 'star_cam_missions']);
  });

  it('with every box cleared it says to archive instead, and does not call the server', async () => {
    mount();
    const dialog = await openEdit('Sam Roe');
    await waitFor(() => expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7));

    await user().click(within(dialog).getByRole('button', { name: 'Clear' }));
    await user().click(within(dialog).getByRole('button', { name: 'Update' }));

    expect(await within(dialog).findByText(/archive them/)).toBeInTheDocument();
    expect(service.updateUser).not.toHaveBeenCalled();
  });

  it('a refusal stays inside the dialog, with what was ticked', async () => {
    service.updateUser.mockRejectedValue(new AdminUserApiError('Unknown area: billing.', { status: 400, code: 'ACCESS_AREAS_INVALID' }));
    mount();
    const dialog = await openEdit('Sam Roe');
    await waitFor(() => expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7));

    await user().click(within(dialog).getByRole('checkbox', { name: 'Experiences' }));
    await user().click(within(dialog).getByRole('button', { name: 'Update' }));

    expect((await within(dialog).findAllByText('Unknown area: billing.')).length).toBeGreaterThan(0);
    expect(ticked(within(dialog))).toEqual(['Notifications', 'Experiences']);
  });

  it('a parent has no access checkboxes', async () => {
    mount({ role: 'parent', list: [{ _id: 'p1', name: 'Pia Park', email: 'pia@example.com', role: 'parent', isActive: true, childProfilesCount: 1 }] });
    await screen.findByText('Pia Park');
    await user().click(screen.getByRole('button', { name: 'Edit user' }));

    await screen.findByRole('dialog');
    expect(screen.queryByText('What this person can use')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- view

describe('View a content creator', () => {
  it('shows an Access section with her areas ticked and nothing to change', async () => {
    mount();
    await table();
    await user().click(within(await rowOf('Sam Roe')).getByRole('button', { name: 'View user' }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7));
    expect(within(dialog).getByText('Access')).toBeInTheDocument();
    expect(ticked(within(dialog))).toEqual(['Notifications']);
    within(dialog).getAllByRole('checkbox').forEach((item) => expect(item).toBeDisabled());
    expect(within(dialog).queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
  });

  it('a parent has no Access section', async () => {
    mount({ role: 'parent', list: [{ _id: 'p1', name: 'Pia Park', email: 'pia@example.com', role: 'parent', isActive: true, childProfilesCount: 1 }] });
    await screen.findByText('Pia Park');
    await user().click(screen.getByRole('button', { name: 'View user' }));

    await screen.findByRole('dialog');
    expect(screen.queryByText('Access')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
