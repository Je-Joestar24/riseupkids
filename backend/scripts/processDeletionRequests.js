/**
 * Process pending account/child deletion requests (Mongo + S3 purge).
 *
 * Usage:
 *   node scripts/processDeletionRequests.js
 *   node scripts/processDeletionRequests.js --force
 *   node scripts/processDeletionRequests.js --id=<requestId>
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const accountDeletionService = require('../services/accountDeletion.service');

async function main() {
  const idArg = process.argv.find((arg) => arg.startsWith('--id='));
  const requestId = idArg ? idArg.split('=')[1] : null;

  await connectDB();

  if (requestId) {
    const result = await accountDeletionService.executeDeletionRequest(requestId);
    console.log('[DeletionScript] Completed request:', requestId, JSON.stringify(result.purgeSummary || {}, null, 2));
  } else {
    const force = process.argv.includes('--force');
    const results = await accountDeletionService.executeAllPendingRequests({ dueOnly: !force });
    console.log(
      `[DeletionScript] Processed ${results.length} ${force ? 'pending (forced)' : 'due'} request(s)`
    );
    results.forEach((row) => {
      console.log(JSON.stringify(row));
    });
  }

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('[DeletionScript] Failed:', error);
  try {
    await mongoose.connection.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
