/**
 * Tag course Videos content Media and remove the tag from internal assets
 * (CMS book clips, SCORM packages, explore, missions, instruction videos, etc.).
 *
 * Usage:
 *   node backend/scripts/backfillCourseVideoMediaTags.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { Media } = require('../models');
const { COURSE_VIDEO_MEDIA_TAG } = require('../constants/courseVideoMedia');
const {
  getInternalVideoMediaIds,
  getCourseVideoCandidateMediaIds,
} = require('../utils/courseVideoMedia.util');

async function backfillCourseVideoMediaTags() {
  try {
    console.log('🔄 Backfilling course-video tags for Videos content...\n');
    await connectDB();

    const [internalIds, candidateIds] = await Promise.all([
      getInternalVideoMediaIds(),
      getCourseVideoCandidateMediaIds(),
    ]);

    console.log(`📊 Internal/non-course video Media: ${internalIds.length}`);
    console.log(`📊 Course video candidates: ${candidateIds.length}\n`);

    const tagResult = candidateIds.length
      ? await Media.updateMany(
          { _id: { $in: candidateIds }, type: 'video' },
          { $addToSet: { tags: COURSE_VIDEO_MEDIA_TAG } }
        )
      : { matchedCount: 0, modifiedCount: 0 };

    const untagResult = internalIds.length
      ? await Media.updateMany(
          { _id: { $in: internalIds }, type: 'video' },
          { $pull: { tags: COURSE_VIDEO_MEDIA_TAG } }
        )
      : { matchedCount: 0, modifiedCount: 0 };

    const listedCount = await Media.countDocuments({
      type: 'video',
      tags: COURSE_VIDEO_MEDIA_TAG,
      isActive: true,
    });

    console.log(`✅ Tagged ${tagResult.modifiedCount} course video(s) (${tagResult.matchedCount} matched)`);
    console.log(`✅ Removed course-video tag from ${untagResult.modifiedCount} internal asset(s)`);
    console.log(`📋 Active course videos on content page after backfill: ${listedCount}\n`);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  backfillCourseVideoMediaTags();
}

module.exports = { backfillCourseVideoMediaTags };
