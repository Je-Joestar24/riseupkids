import { notificationInboxService } from '@/services/notificationInboxService';

jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const { api } = jest.requireMock('@/services/api') as {
  api: { get: jest.Mock; post: jest.Mock };
};

describe('notificationInboxService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the parent inbox and marks items read', async () => {
    api.get.mockResolvedValue({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    api.post.mockResolvedValue({ success: true, data: { unreadCount: 0 } });

    await notificationInboxService.list({ page: 1, limit: 20 });
    await notificationInboxService.unreadCount();
    await notificationInboxService.markRead('rec-1');
    await notificationInboxService.markAllRead();

    expect(api.get).toHaveBeenNthCalledWith(1, '/notifications/inbox', { params: { page: 1, limit: 20 } });
    expect(api.get).toHaveBeenNthCalledWith(2, '/notifications/inbox/unread-count');
    expect(api.post).toHaveBeenNthCalledWith(1, '/notifications/inbox/rec-1/read');
    expect(api.post).toHaveBeenNthCalledWith(2, '/notifications/inbox/read-all');
  });
});
