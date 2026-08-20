import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import api from '../api/axios';
import adminNotificationsService from './adminNotificationsService';

describe('adminNotificationsService Phase 2 endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules with local date, time, and timezone', async () => {
    api.post.mockResolvedValue({ data: { success: true, data: { status: 'scheduled' } } });

    await adminNotificationsService.schedule('camp-1', {
      sendDate: '2026-08-20',
      sendTime: '09:00',
      timezone: 'America/Sao_Paulo',
    });

    expect(api.post).toHaveBeenCalledWith('/admin/notifications/camp-1/schedule', {
      sendDate: '2026-08-20',
      sendTime: '09:00',
      timezone: 'America/Sao_Paulo',
    });
  });

  it('posts send-now, test, and cancel without marking extra recipients on test', async () => {
    api.post.mockResolvedValue({ data: { success: true, data: { targeted: 1 } } });

    await adminNotificationsService.sendNow('camp-1');
    await adminNotificationsService.sendTest('camp-1', 'user-test');
    await adminNotificationsService.cancel('camp-1');

    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/notifications/camp-1/send-now');
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/notifications/camp-1/test', {
      userId: 'user-test',
    });
    expect(api.post).toHaveBeenNthCalledWith(3, '/admin/notifications/camp-1/cancel');
  });
});
