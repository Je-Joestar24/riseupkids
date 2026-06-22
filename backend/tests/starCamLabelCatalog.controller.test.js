jest.mock('../services/starCamVisionLabel.service', () => ({
  searchLabels: jest.fn(),
  listRecentCustomLabels: jest.fn(),
  createCustomLabel: jest.fn(),
}));

const starCamVisionLabelService = require('../services/starCamVisionLabel.service');
const {
  searchLabelCatalog,
  listRecentCustomLabels,
  createCustomLabel,
} = require('../controllers/starCamLabelCatalog.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('starCamLabelCatalog.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searchLabelCatalog returns service results', async () => {
    starCamVisionLabelService.searchLabels.mockResolvedValue({
      query: 'book',
      results: [{ labelId: '/m/book', displayName: 'Book', source: 'oidv7' }],
    });
    const req = { query: { q: 'book', limit: '10' } };
    const res = mockRes();

    await searchLabelCatalog(req, res);

    expect(starCamVisionLabelService.searchLabels).toHaveBeenCalledWith({
      query: 'book',
      limit: '10',
      childFriendlyOnly: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        query: 'book',
        results: [{ labelId: '/m/book', displayName: 'Book', source: 'oidv7' }],
      },
    });
  });

  it('listRecentCustomLabels returns recent custom labels', async () => {
    starCamVisionLabelService.listRecentCustomLabels.mockResolvedValue({
      results: [{ labelId: 'custom:plush_bear', displayName: 'Plush Bear', source: 'custom' }],
    });
    const req = { query: { limit: '5' } };
    const res = mockRes();

    await listRecentCustomLabels(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        results: [{ labelId: 'custom:plush_bear', displayName: 'Plush Bear', source: 'custom' }],
      },
    });
  });

  it('createCustomLabel returns 201 with created label', async () => {
    starCamVisionLabelService.createCustomLabel.mockResolvedValue({
      labelId: 'custom:plush_bear',
      displayName: 'Plush Bear',
      source: 'custom',
    });
    const req = {
      body: { displayName: 'Plush Bear', defaultTerms: ['plush bear'] },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = mockRes();

    await createCustomLabel(req, res);

    expect(starCamVisionLabelService.createCustomLabel).toHaveBeenCalledWith({
      displayName: 'Plush Bear',
      defaultTerms: ['plush bear'],
      createdBy: '507f1f77bcf86cd799439011',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('createCustomLabel maps duplicate errors to 409', async () => {
    const error = new Error('A label with this name already exists');
    error.statusCode = 409;
    error.existingLabelId = 'custom:apple';
    starCamVisionLabelService.createCustomLabel.mockRejectedValue(error);

    const req = { body: { displayName: 'Apple' }, user: { _id: '507f1f77bcf86cd799439011' } };
    const res = mockRes();

    await createCustomLabel(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'A label with this name already exists',
      existingLabelId: 'custom:apple',
    });
  });
});
