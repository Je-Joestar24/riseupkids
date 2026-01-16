/**
 * Migration Script: Explore Video Types Refactoring
 * 
 * This script migrates existing ExploreContent records from the old videoType enum
 * ['replay', 'activity'] to the new enum with 7 types:
 * ['replay', 'arts_crafts', 'cooking', 'music', 'movement_fitness', 'story_time', 'manners_etiquette']
 * 
 * Migration Strategy:
 * - 'replay' -> 'replay' (no change)
 * - 'activity' -> 'arts_crafts' (default mapping, admin can manually change later)
 * 
 * Usage:
 * node backend/scripts/migrateExploreVideoTypes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { ExploreContent } = require('../models');
const connectDB = require('../config/database');

const migrateExploreVideoTypes = async () => {
  try {
    console.log('🔄 Starting Explore Video Types Migration...\n');

    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Find all records with old videoType values
    const oldActivityRecords = await ExploreContent.find({
      videoType: 'activity',
    });

    const oldReplayRecords = await ExploreContent.find({
      videoType: 'replay',
    });

    console.log(`📊 Found ${oldActivityRecords.length} records with videoType: 'activity'`);
    console.log(`📊 Found ${oldReplayRecords.length} records with videoType: 'replay'\n`);

    // Migrate 'activity' to 'arts_crafts'
    if (oldActivityRecords.length > 0) {
      console.log('🔄 Migrating "activity" records to "arts_crafts"...');
      const result = await ExploreContent.updateMany(
        { videoType: 'activity' },
        { $set: { videoType: 'arts_crafts' } }
      );
      console.log(`✅ Migrated ${result.modifiedCount} records from 'activity' to 'arts_crafts'\n`);
    }

    // Verify replay records (should remain unchanged)
    if (oldReplayRecords.length > 0) {
      console.log(`✅ ${oldReplayRecords.length} 'replay' records remain unchanged\n`);
    }

    // Check for any invalid videoType values
    const invalidRecords = await ExploreContent.find({
      videoType: { $nin: ['replay', 'arts_crafts', 'cooking', 'music', 'movement_fitness', 'story_time', 'manners_etiquette'] },
    });

    if (invalidRecords.length > 0) {
      console.log(`⚠️  Warning: Found ${invalidRecords.length} records with invalid videoType values:`);
      invalidRecords.forEach(record => {
        console.log(`   - ID: ${record._id}, videoType: ${record.videoType}, title: ${record.title}`);
      });
      console.log('\n💡 These records need manual review and update.\n');
    }

    // Final verification
    const allRecords = await ExploreContent.find({ type: 'video' });
    const typeCounts = {};
    allRecords.forEach(record => {
      const type = record.videoType || 'null';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    console.log('📊 Final videoType distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} records`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('💡 Note: Review migrated records and update videoType manually if needed.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run migration
if (require.main === module) {
  migrateExploreVideoTypes();
}

module.exports = { migrateExploreVideoTypes };
