const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { StarCamVisionLabel } = require('../models');
const { readOidLabelCsv, DEFAULT_CSV_PATH } = require('../utils/oidLabelCsv.util');

dotenv.config();

const BATCH_SIZE = 500;

async function upsertOidBatch(batch) {
  if (!batch.length) return { upserted: 0, modified: 0 };

  const ops = batch.map((row) => ({
    updateOne: {
      filter: { labelId: row.labelId, source: 'oidv7' },
      update: {
        $set: {
          displayName: row.displayName,
          searchKey: row.searchKey,
          source: 'oidv7',
          isActive: true,
        },
        $setOnInsert: {
          isChildFriendly: false,
          isAvailableForMissions: false,
          defaultTerms: [],
          usageCount: 0,
          createdBy: null,
          updatedBy: null,
        },
      },
      upsert: true,
    },
  }));

  const result = await StarCamVisionLabel.bulkWrite(ops, { ordered: false });
  return {
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

async function seedOidVisionLabels({ csvPath = DEFAULT_CSV_PATH } = {}) {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const dbName = mongoose.connection.db?.databaseName;
  const collName = StarCamVisionLabel.collection.name;
  console.log(`[OidVisionLabelSeeder] MongoDB Connected: ${conn.connection.host}`);
  console.log(`[OidVisionLabelSeeder] Database: ${dbName || '(unknown)'}  Collection: ${collName}`);
  console.log(`[OidVisionLabelSeeder] Reading CSV: ${csvPath}`);

  const rows = readOidLabelCsv(csvPath);
  console.log(`[OidVisionLabelSeeder] Parsed ${rows.length} OID rows (LabelName + DisplayName)`);

  let upserted = 0;
  let modified = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const stats = await upsertOidBatch(batch);
    upserted += stats.upserted;
    modified += stats.modified;
    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`[OidVisionLabelSeeder] Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  }

  const oidTotal = await StarCamVisionLabel.countDocuments({ source: 'oidv7' });
  const customTotal = await StarCamVisionLabel.countDocuments({ source: 'custom' });
  const grandTotal = await StarCamVisionLabel.countDocuments();

  console.log(
    `[OidVisionLabelSeeder] Done. upserted=${upserted}, modified=${modified}, oidTotal=${oidTotal}, customTotal=${customTotal}, grandTotal=${grandTotal}`
  );

  await mongoose.connection.close();
  return { upserted, modified, oidTotal, customTotal, grandTotal, parsed: rows.length };
}

if (require.main === module) {
  seedOidVisionLabels()
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error('[OidVisionLabelSeeder] Failed:', error);
      await mongoose.connection.close();
      process.exit(1);
    });
}

module.exports = { seedOidVisionLabels, upsertOidBatch, BATCH_SIZE };
