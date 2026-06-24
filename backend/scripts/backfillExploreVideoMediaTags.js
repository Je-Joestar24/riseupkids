/**
 * Backfill explore-video tags on Media records linked from Explore page content.
 *
 * Run once so existing explore videos (all video types) are excluded from the
 * course/journey Videos content admin list even if ExploreContent links are incomplete.
 *
 * Usage:
 *   node backend/scripts/backfillExploreVideoMediaTags.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { ExploreContent, Media } = require('../models');
const {
  ALL_EXPLORE_VIDEO_TYPE_VALUES,
  EXPLORE_VIDEO_MEDIA_TAG,
} = require('../constants/exploreVideoTypes');

const EXPLORE_CONTENT_VIDEO_QUERY = {
  $or: [
    { type: 'video' },
    { videoType: { $in: ALL_EXPLORE_VIDEO_TYPE_VALUES } },
    { videoFile: { $ne: null } },
  ],
};

async function backfillExploreVideoMediaTags() {
  try {
    console.log('🔄 Backfilling explore-video tags on Media records...\n');
    await connectDB();

    const exploreRows = await ExploreContent.find(EXPLORE_CONTENT_VIDEO_QUERY)
      .select('title videoType type videoFile contentRef contentRefModel')
      .lean();

    const mediaIds = new Set();
    for (const row of exploreRows) {
      if (row.videoFile) mediaIds.add(String(row.videoFile));
      if (row.contentRefModel === 'Media' && row.contentRef) {
        mediaIds.add(String(row.contentRef));
      }
    }

    console.log(`📊 Found ${exploreRows.length} explore video rows`);
    console.log(`📊 Found ${mediaIds.size} linked Media records to tag\n`);

    if (mediaIds.size === 0) {
      console.log('✅ No explore video Media records to update.\n');
      return;
    }

    const result = await Media.updateMany(
      {
        _id: { $in: [...mediaIds] },
        type: 'video',
      },
      {
        $addToSet: { tags: EXPLORE_VIDEO_MEDIA_TAG },
      }
    );

    const typeCounts = {};
    for (const row of exploreRows) {
      const key = row.videoType || row.type || 'unknown';
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    }

    console.log('📊 Explore rows by video type:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    console.log(`\n✅ Tagged ${result.modifiedCount} Media record(s) with "${EXPLORE_VIDEO_MEDIA_TAG}"`);
    console.log(`   (${result.matchedCount} matched; already-tagged rows are unchanged)\n`);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  backfillExploreVideoMediaTags();
}

module.exports = { backfillExploreVideoMediaTags };
