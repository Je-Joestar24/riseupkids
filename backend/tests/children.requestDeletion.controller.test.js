jest.mock('../services/accountDeletion.service', () => ({
  requestChildProfileDeletion: jest.fn(),
}));

const accountDeletionService = require('../services/accountDeletion.service');
const { requestChildDeletion } = require('../controllers/children.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('children.controller requestChildDeletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates child deletion request for parent', async () => {
    accountDeletionService.requestChildProfileDeletion.mockResolvedValue({
      childId: 'child1',
      displayName: 'Alex',
      accessRevoked: true,
      message: 'Access revoked.',
    });

    const req = {
      params: { id: 'child1' },
      user: { _id: 'parent1', role: 'parent' },
      body: { password: 'secret123', confirmText: 'DELETE' },
      headers: { 'x-forwarded-for': '203.0.113.10, 70.41.3.18' },
      socket: {},
    };
    const res = mockRes();

    await requestChildDeletion(req, res);

    expect(accountDeletionService.requestChildProfileDeletion).toHaveBeenCalledWith(
      'parent1',
      'child1',
      {
        password: 'secret123',
        confirmText: 'DELETE',
        requesterIp: '203.0.113.10',
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Access revoked.',
      data: expect.objectContaining({ accessRevoked: true }),
    });
  });

  it('returns 403 for non-parent role', async () => {
    const req = {
      params: { id: 'child1' },
      user: { _id: 'teacher1', role: 'teacher' },
      body: { password: 'secret123', confirmText: 'DELETE' },
    };
    const res = mockRes();

    await requestChildDeletion(req, res);

    expect(accountDeletionService.requestChildProfileDeletion).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when child is not found for parent', async () => {
    accountDeletionService.requestChildProfileDeletion.mockRejectedValue(
      new Error('Child profile not found or does not belong to you')
    );

    const req = {
      params: { id: 'child1' },
      user: { _id: 'parent1', role: 'parent' },
      body: { password: 'secret123', confirmText: 'DELETE' },
      headers: {},
      socket: {},
    };
    const res = mockRes();

    await requestChildDeletion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
