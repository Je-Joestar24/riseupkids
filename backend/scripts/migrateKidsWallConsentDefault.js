const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { ChildProfile } = require('../models');

dotenv.config();

/**
 * Enable Kids Wall for existing child profiles that are blocked or missing the flag.
 * Kids Wall is allowed by default; parents can block it per child afterward.
 */
async function migrateKidsWallConsentDefault({ consentAt = new Date() } = {}) {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`[KidsWallConsentDefault] Connected: ${conn.connection.host}`);

  const filter = {
    $or: [{ kidsWallEnabled: { $ne: true } }, { kidsWallEnabled: { $exists: false } }],
  };

  const matchedCount = await ChildProfile.countDocuments(filter);
  const result = await ChildProfile.updateMany(filter, {
    $set: {
      kidsWallEnabled: true,
      kidsWallConsentAt: consentAt,
    },
  });

  console.log(
    `[KidsWallConsentDefault] Done. matched=${matchedCount}, modified=${result.modifiedCount ?? result.nModified ?? 0}`
  );

  await mongoose.connection.close();

  return {
    matchedCount,
    modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
  };
}

if (require.main === module) {
  migrateKidsWallConsentDefault()
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error('[KidsWallConsentDefault] Failed:', error);
      await mongoose.connection.close();
      process.exit(1);
    });
}

module.exports = { migrateKidsWallConsentDefault };
