jest.mock('../services/cmsBookAdmin.service', () => ({
  createCmsBook: jest.fn(),
  listCmsBooks: jest.fn(),
  getCmsBookById: jest.fn(),
  updateCmsBook: jest.fn(),
  publishCmsBook: jest.fn(),
  unpublishCmsBook: jest.fn(),
  archiveCmsBook: jest.fn(),
}));

const service = require('../services/cmsBookAdmin.service');
const controller = require('../controllers/cmsBookAdmin.controller');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('cmsBookAdmin.controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates cms book and returns 201', async () => {
    service.createCmsBook.mockResolvedValue({ _id: 'book-1' });
    const req = { user: { _id: 'admin-1' }, body: { title: 'Book' } };
    const res = makeRes();

    await controller.createCmsBook(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(service.createCmsBook).toHaveBeenCalledWith({
      userId: 'admin-1',
      payload: { title: 'Book' },
    });
  });

  it('lists books and returns 200', async () => {
    service.listCmsBooks.mockResolvedValue({ items: [], pagination: { total: 0 } });
    const req = { query: { page: '1', limit: '10' } };
    const res = makeRes();

    await controller.listCmsBooks(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(service.listCmsBooks).toHaveBeenCalled();
  });

  it('returns propagated statusCode on service error', async () => {
    const err = new Error('bad request');
    err.statusCode = 400;
    service.updateCmsBook.mockRejectedValue(err);
    const req = { params: { id: 'book-1' }, user: { _id: 'admin-1' }, body: {} };
    const res = makeRes();

    await controller.updateCmsBook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
