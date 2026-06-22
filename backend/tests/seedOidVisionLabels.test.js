jest.mock('../models', () => ({
  StarCamVisionLabel: {
    bulkWrite: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const { StarCamVisionLabel } = require('../models');
const { upsertOidBatch, BATCH_SIZE } = require('../scripts/seedOidVisionLabels');
const { parseOidLabelCsv } = require('../utils/oidLabelCsv.util');

describe('seedOidVisionLabels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses batch size of 500', () => {
    expect(BATCH_SIZE).toBe(500);
  });

  it('upsertOidBatch writes oid rows without touching custom-only fields on insert', async () => {
    StarCamVisionLabel.bulkWrite.mockResolvedValue({ upsertedCount: 2, modifiedCount: 0 });

    const batch = [
      { labelId: '/m/0c9ph5', displayName: 'Apple', searchKey: 'apple' },
      { labelId: '/m/0hz5', displayName: 'Aardvark', searchKey: 'aardvark' },
    ];

    const stats = await upsertOidBatch(batch);
    expect(stats.upserted).toBe(2);
    expect(StarCamVisionLabel.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: { labelId: '/m/0c9ph5', source: 'oidv7' },
            update: expect.objectContaining({
              $set: expect.objectContaining({
                displayName: 'Apple',
                searchKey: 'apple',
                source: 'oidv7',
              }),
              $setOnInsert: expect.objectContaining({
                defaultTerms: [],
                usageCount: 0,
              }),
            }),
          }),
        }),
      ]),
      { ordered: false }
    );
  });

  it('parses fixture csv with both LabelName and DisplayName columns', () => {
    const csv = [
      'LabelName,DisplayName',
      '/m/0c9ph5,Apple',
      '/m/01wdp,"Cucumber, gourd, and melon family"',
    ].join('\n');
    const rows = parseOidLabelCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].labelId).toBe('/m/0c9ph5');
    expect(rows[1].displayName).toContain('Cucumber');
  });
});
