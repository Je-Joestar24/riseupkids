jest.mock('../services/accountDeletion.service', () => ({
  listDeletionRequests: jest.fn(),
  executeDeletionRequest: jest.fn(),
  executeAllPendingRequests: jest.fn(),
}));

const accountDeletionService = require('../services/accountDeletion.service');
const {
  listDeletionRequests,
  executeDeletionRequest,
  executeAllPendingDeletionRequests,
} = require('../controllers/accountDeletion.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('accountDeletion.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listDeletionRequests returns paginated admin data', async () => {
    accountDeletionService.listDeletionRequests.mockResolvedValue([
      { _id: 'req1', type: 'parent_account', status: 'pending' },
    ]);
    const req = { query: { status: 'pending', limit: '10' } };
    const res = mockRes();

    await listDeletionRequests(req, res);

    expect(accountDeletionService.listDeletionRequests).toHaveBeenCalledWith({
      status: 'pending',
      limit: 10,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ _id: 'req1', type: 'parent_account', status: 'pending' }],
      count: 1,
    });
  });

  it('executeDeletionRequest returns success payload', async () => {
    accountDeletionService.executeDeletionRequest.mockResolvedValue({
      request: { _id: 'req1', status: 'completed' },
      purgeSummary: { childId: 'child1' },
    });
    const req = { params: { id: 'req1' } };
    const res = mockRes();

    await executeDeletionRequest(req, res);

    expect(accountDeletionService.executeDeletionRequest).toHaveBeenCalledWith('req1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Deletion request completed successfully',
      })
    );
  });

  it('executeAllPendingDeletionRequests processes due batch by default', async () => {
    accountDeletionService.executeAllPendingRequests.mockResolvedValue([
      { requestId: 'req1', success: true },
    ]);
    const req = { query: {} };
    const res = mockRes();

    await executeAllPendingDeletionRequests(req, res);

    expect(accountDeletionService.executeAllPendingRequests).toHaveBeenCalledWith({ dueOnly: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Processed 1 due deletion request(s)',
      data: [{ requestId: 'req1', success: true }],
      dueOnly: true,
    });
  });

  it('executeAllPendingDeletionRequests can force all pending requests', async () => {
    accountDeletionService.executeAllPendingRequests.mockResolvedValue([]);
    const req = { query: { force: 'true' } };
    const res = mockRes();

    await executeAllPendingDeletionRequests(req, res);

    expect(accountDeletionService.executeAllPendingRequests).toHaveBeenCalledWith({ dueOnly: false });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        dueOnly: false,
        message: 'Processed 0 pending deletion request(s) (forced)',
      })
    );
  });
});
