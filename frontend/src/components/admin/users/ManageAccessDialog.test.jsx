/**
 * Manage access: one creator or several. Opens with what they have, marks what will change, asks before taking
 * anything away, and shows a refusal inside the dialog without closing it.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';

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
import parentsReducer from '../../../store/slices/parentsSlice';
import uiReducer from '../../../store/slices/uiSlice';
import ManageAccessDialog from './ManageAccessDialog';

const theme = createTheme({ palette: { orange: { main: '#e98a68' }, border: { main: '#e2e8f0' } } });

const OPTIONS = {
  areas: [
    { key: 'dashboard', label: 'Dashboard', help: 'The home page', legacy: true },
    { key: 'contents', label: 'Contents', help: 'Lessons and videos', legacy: true },
    { key: 'explore', label: 'Explore', help: 'Explore videos', legacy: true },
    { key: 'star_cam_missions', label: 'Star Cam Missions', help: 'Missions', legacy: true },
    { key: 'notifications', label: 'Notifications', help: 'Push notifications', legacy: false },
  ],
  legacyAreas: ['dashboard', 'contents', 'explore', 'star_cam_missions'],
};

const pat = { _id: 'c1', name: 'Pat Lee', role: 'content_creator', accessAreas: ['dashboard', 'contents', 'explore', 'star_cam_missions'] };
const sam = { _id: 'c2', name: 'Sam Roe', role: 'content_creator', accessAreas: ['dashboard', 'contents', 'explore'] };
const kim = { _id: 'c3', name: 'Kim Wu', role: 'content_creator', accessAreas: ['dashboard', 'explore', 'notifications'] };

let store;
let onClose;
let onSaved;
const click = () => userEvent.setup();
const box = (name) => screen.getByRole('checkbox', { name });
const ticked = () => screen.getAllByRole('checkbox').filter((item) => item.checked).map((item) => item.getAttribute('aria-label'));
const save = () => screen.getByRole('button', { name: /Save access|Saving/ });
const notice = () => store.getState().ui.notification;

async function open(creators, { open: isOpen = true } = {}) {
  store = configureStore({ reducer: { parents: parentsReducer, ui: uiReducer } });
  onClose = vi.fn();
  onSaved = vi.fn();
  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <ManageAccessDialog open={isOpen} onClose={onClose} creators={creators} onSaved={onSaved} />
      </ThemeProvider>
    </Provider>
  );
  if (isOpen) await screen.findAllByRole('checkbox');
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  service.getAccessAreas.mockResolvedValue(OPTIONS);
});

describe('one creator: what you see', () => {
  it('opens with her name and the ticks she has today, and nothing to save yet', async () => {
    await open([pat]);

    expect(screen.getByRole('dialog', { name: 'Manage access: Pat Lee' })).toBeInTheDocument();
    expect(ticked()).toEqual(['Dashboard', 'Contents', 'Explore', 'Star Cam Missions']);
    expect(save()).toBeDisabled();
    expect(screen.queryByText(/Will be/)).not.toBeInTheDocument();
  });

  it('shows every area, with Notifications unticked for a creator from before (she has never had it)', async () => {
    await open([pat]);

    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(box('Notifications').checked).toBe(false);
  });

  it('asks for the checkboxes once, however often the dialog is opened', async () => {
    const view = await open([pat]);
    const dialog = (isOpen, creators) => (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ManageAccessDialog open={isOpen} onClose={onClose} creators={creators} onSaved={onSaved} />
        </ThemeProvider>
      </Provider>
    );

    view.rerender(dialog(false, [pat]));
    view.rerender(dialog(true, [sam]));
    await screen.findAllByRole('checkbox');
    view.rerender(dialog(false, [sam]));
    view.rerender(dialog(true, [kim]));
    await screen.findAllByRole('checkbox');

    expect(service.getAccessAreas).toHaveBeenCalledTimes(1);
  });

  it('shows nothing while closed', async () => {
    await open([pat], { open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(service.getAccessAreas).not.toHaveBeenCalled();
  });
});

describe('one creator: marking changes', () => {
  it('marks a removed area and a new one', async () => {
    await open([pat]);

    await click().click(box('Explore'));
    await click().click(box('Notifications'));

    expect(screen.getByText('Will be removed')).toBeInTheDocument();
    expect(screen.getByText('Will be added')).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('turns the marks off again when a change is undone, and Save goes back to disabled', async () => {
    await open([pat]);

    await click().click(box('Explore'));
    await click().click(box('Explore'));

    expect(screen.queryByText(/Will be/)).not.toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('with nothing ticked says to use Archive instead, and cannot be saved', async () => {
    await open([pat]);

    await click().click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByText(/To stop someone using the site entirely, use Archive instead/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });
});

describe('one creator: adding only', () => {
  it('saves straight away, with no question', async () => {
    service.setCreatorAccess.mockResolvedValue({ data: { ...pat, accessAreas: [...pat.accessAreas, 'notifications'] }, previousAccessAreas: pat.accessAreas, changed: true });
    await open([pat]);

    await click().click(box('Notifications'));
    await click().click(save());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(service.setCreatorAccess).toHaveBeenCalledWith('c1', ['dashboard', 'contents', 'explore', 'star_cam_missions', 'notifications']);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ changed: true }));
    expect(notice()).toEqual(expect.objectContaining({ type: 'success', message: 'Access updated successfully' }));
  });
});

describe('one creator: taking something away', () => {
  it('asks first, naming what she will lose, and saves nothing yet', async () => {
    await open([pat]);

    await click().click(box('Explore'));
    await click().click(box('Star Cam Missions'));
    await click().click(save());

    const question = screen.getByRole('alertdialog', { name: 'Confirm removing access' });
    expect(within(question).getByText('Pat Lee will lose access to Explore and Star Cam Missions straight away.')).toBeInTheDocument();
    expect(within(question).getByText(/Content Pat Lee created stays in the system/)).toBeInTheDocument();
    expect(service.setCreatorAccess).not.toHaveBeenCalled();
  });

  it('names only what is taken away when something is also added', async () => {
    await open([pat]);

    await click().click(box('Contents'));
    await click().click(box('Notifications'));
    await click().click(save());

    expect(screen.getByText('Pat Lee will lose access to Contents straight away.')).toBeInTheDocument();
  });

  it('Back returns to the checkboxes with every tick as it was, and nothing saved', async () => {
    await open([pat]);
    await click().click(box('Explore'));
    await click().click(save());

    await click().click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(ticked()).toEqual(['Dashboard', 'Contents', 'Star Cam Missions']);
    expect(service.setCreatorAccess).not.toHaveBeenCalled();
  });

  it('"Yes, remove access" saves, closes, and tells the admin', async () => {
    service.setCreatorAccess.mockResolvedValue({ data: { ...pat, accessAreas: ['dashboard', 'contents', 'star_cam_missions'] }, changed: true });
    await open([pat]);
    await click().click(box('Explore'));
    await click().click(save());

    await click().click(screen.getByRole('button', { name: 'Yes, remove access' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(service.setCreatorAccess).toHaveBeenCalledWith('c1', ['dashboard', 'contents', 'star_cam_missions']);
    expect(notice().message).toBe('Access updated successfully');
  });
});

describe('one creator: when the server refuses', () => {
  it('shows the reason inside the dialog, keeps it open, and keeps what was ticked', async () => {
    service.setCreatorAccess.mockRejectedValue(new AdminUserApiError('This content creator could not be found. They may have been removed.', { status: 404, code: 'CONTENT_CREATOR_NOT_FOUND' }));
    await open([pat]);
    await click().click(box('Notifications'));

    await click().click(save());

    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(ticked()).toContain('Notifications');
    expect(notice().open).toBe(false);
  });

  it('after a refused removal, goes back to the checkboxes (not stuck on the question) with the reason', async () => {
    service.setCreatorAccess.mockRejectedValue(new AdminUserApiError('Could not reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR' }));
    await open([pat]);
    await click().click(box('Explore'));
    await click().click(save());

    await click().click(screen.getByRole('button', { name: 'Yes, remove access' }));

    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(box('Explore').checked).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('lets the admin try again after a refusal, and clears the old reason', async () => {
    service.setCreatorAccess.mockRejectedValueOnce(new AdminUserApiError('Could not reach the server. Check your connection and try again.'));
    service.setCreatorAccess.mockResolvedValueOnce({ data: { ...pat, accessAreas: [...pat.accessAreas, 'notifications'] }, changed: true });
    await open([pat]);
    await click().click(box('Notifications'));
    await click().click(save());
    await screen.findByText(/Could not reach the server/);

    await click().click(save());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Could not reach the server/)).not.toBeInTheDocument();
  });
});

describe('one creator: while it saves', () => {
  it('disables everything and shows "Saving..."', async () => {
    let resolve;
    service.setCreatorAccess.mockReturnValue(new Promise((r) => { resolve = r; }));
    await open([pat]);
    await click().click(box('Notifications'));
    await click().click(save());

    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    screen.getAllByRole('checkbox').forEach((item) => expect(item).toBeDisabled());
    resolve({ data: { ...pat, accessAreas: [...pat.accessAreas, 'notifications'] }, changed: true });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('does not close on Escape while it saves, so the person cannot lose sight of a save in progress', async () => {
    let resolve;
    service.setCreatorAccess.mockReturnValue(new Promise((r) => { resolve = r; }));
    await open([pat]);
    const user = click();
    await user.click(box('Notifications'));
    await user.click(save());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled());

    // Sent to the dialog itself: after clicking Save nothing inside it has focus, so a typed key would miss it
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    resolve({ data: { ...pat, accessAreas: [...pat.accessAreas, 'notifications'] }, changed: true });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('one creator: leaving', () => {
  it('Cancel closes without saving', async () => {
    await open([pat]);
    await click().click(box('Notifications'));

    await click().click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(service.setCreatorAccess).not.toHaveBeenCalled();
  });

  it('the X closes without saving', async () => {
    await open([pat]);

    await click().click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('starts fresh for the next person (the ticks of the last one do not stay)', async () => {
    const view = await open([pat]);
    await click().click(box('Notifications'));
    view.rerender(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ManageAccessDialog open onClose={onClose} creators={[sam]} onSaved={onSaved} />
        </ThemeProvider>
      </Provider>
    );

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Manage access: Sam Roe' })).toBeInTheDocument());
    expect(ticked()).toEqual(['Dashboard', 'Contents', 'Explore']);
  });
});

describe('when the checkboxes cannot be loaded', () => {
  it('says why, and Retry loads them', async () => {
    service.getAccessAreas.mockRejectedValueOnce(new AdminUserApiError('Could not reach the server. Check your connection and try again.'));
    store = configureStore({ reducer: { parents: parentsReducer, ui: uiReducer } });
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <ManageAccessDialog open onClose={vi.fn()} creators={[pat]} />
        </ThemeProvider>
      </Provider>
    );

    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
    expect(save()).toBeDisabled();

    await click().click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findAllByRole('checkbox')).toHaveLength(5);
  });
});

describe('several people at once', () => {
  it('opens with the areas EVERY one of them has, and says everyone gets exactly these', async () => {
    await open([pat, sam, kim]);

    expect(screen.getByRole('dialog', { name: 'Manage access: 3 people' })).toBeInTheDocument();
    expect(ticked()).toEqual(['Dashboard', 'Explore']);
    expect(screen.getByText('Everyone chosen will get exactly these areas.')).toBeInTheDocument();
  });

  it('marks, for each area, how many people would gain or lose it', async () => {
    await open([pat, sam, kim]);

    await click().click(box('Notifications'));
    await click().click(box('Explore'));

    expect(screen.getByText('Will be added for 2 people')).toBeInTheDocument();
    expect(screen.getByText('Will be removed for 3 people')).toBeInTheDocument();
  });

  it('shows the marks for an area only some of them have, even when it was not ticked to begin with', async () => {
    await open([pat, sam, kim]);

    expect(screen.getByText('Will be removed for 2 people')).toBeInTheDocument(); // Contents: Pat and Sam have it
    // Star Cam Missions (only Pat has it) and Notifications (only Kim has it)
    expect(screen.getAllByText('Will be removed for 1 person')).toHaveLength(2);
  });

  it('asks first, counting only the people who lose something', async () => {
    await open([pat, sam, kim]);
    await click().click(box('Notifications'));

    await click().click(save());

    expect(screen.getByText(/2 people will lose access to Contents and Star Cam Missions straight away\./)).toBeInTheDocument();
    expect(screen.getByText(/Content they created stays in the system/)).toBeInTheDocument();
    expect(service.setCreatorAccessBulk).not.toHaveBeenCalled();
  });

  it('saves the same list for all, with their ids, and says how many changed', async () => {
    service.setCreatorAccessBulk.mockResolvedValue({ message: 'Access updated for 3 people', data: [], matched: 3, changed: 3 });
    await open([pat, sam, kim]);
    await click().click(box('Notifications'));
    await click().click(save());

    await click().click(screen.getByRole('button', { name: 'Yes, remove access' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(service.setCreatorAccessBulk).toHaveBeenCalledWith(['c1', 'c2', 'c3'], ['dashboard', 'explore', 'notifications']);
    expect(notice().message).toBe('Access updated for 3 people');
  });

  it('cannot be saved when nobody would change', async () => {
    await open([sam, { ...sam, _id: 'c4', name: 'Zed' }]);

    expect(save()).toBeDisabled();
  });

  it('with nothing ticked says to use Archive, and cannot be saved', async () => {
    await open([pat, sam]);

    await click().click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByText(/use Archive instead/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('shows a refusal inside the dialog and keeps it open', async () => {
    service.setCreatorAccessBulk.mockRejectedValue(new AdminUserApiError('Choose at most 100 people at a time.', { status: 400, code: 'ACCESS_BULK_INVALID' }));
    await open([pat, sam]);
    await click().click(box('Notifications'));
    await click().click(save());
    await click().click(screen.getByRole('button', { name: 'Yes, remove access' }));

    expect(await screen.findByText('Choose at most 100 people at a time.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
