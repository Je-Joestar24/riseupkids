/**
 * Heal stale course content completion:
 * 1) Books with required readings met → mark contentProgress completed
 * 2) Approved audio assignments → mark audioAssignment completed on courses
 * 3) Optional: approve still-submitted audio for a child (teacher checking catch-up)
 *
 * Usage:
 *   node scripts/healCourseContentCompletion.js
 *   node scripts/healCourseContentCompletion.js --child Cheska --approve-submitted
 *   node scripts/healCourseContentCompletion.js --dry-run
 *   node scripts/healCourseContentCompletion.js --child jejo13@gmail.com --approve-submitted
 */
require('dotenv').config();
const mongoose = require('mongoose');
const {
  ChildProfile,
  User,
  Course,
  CourseProgress,
  Book,
  BookReading,
  AudioAssignmentProgress,
} = require('../models');
const {
  updateContentProgress,
  recalculateProgressForCourse,
} = require('../services/courseProgress.services');

function parseArgs(argv) {
  const args = {
    dryRun: argv.includes('--dry-run'),
    approveSubmitted: argv.includes('--approve-submitted'),
    child: null,
  };
  const idx = argv.indexOf('--child');
  if (idx >= 0 && argv[idx + 1]) args.child = String(argv[idx + 1]).trim();
  return args;
}

async function resolveChildren(childQuery) {
  if (!childQuery) {
    return ChildProfile.find({ isActive: { $ne: false } }).select('_id displayName parent').lean();
  }

  if (mongoose.Types.ObjectId.isValid(childQuery) && String(childQuery).length === 24) {
    const byId = await ChildProfile.findById(childQuery).select('_id displayName parent').lean();
    return byId ? [byId] : [];
  }

  if (childQuery.includes('@')) {
    const parent = await User.findOne({ email: childQuery.toLowerCase() }).select('_id').lean();
    if (!parent) return [];
    return ChildProfile.find({ parent: parent._id }).select('_id displayName parent').lean();
  }

  return ChildProfile.find({
    displayName: new RegExp(`^${childQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  })
    .select('_id displayName parent')
    .lean();
}

async function healBooksForChild(childId, { dryRun }) {
  const progresses = await CourseProgress.find({ child: childId });
  let healed = 0;

  for (const progress of progresses) {
    const course = await Course.findById(progress.course);
    if (!course?.contents?.length) continue;

    for (const item of course.contents) {
      if (item.contentType !== 'book') continue;
      const bookId = item.contentId;
      const book = await Book.findById(bookId).select('requiredReadingCount title').lean();
      const required = book?.requiredReadingCount || 5;
      const readingCount = await BookReading.getCompletedReadingCount(childId, bookId);
      if (readingCount < required) continue;

      const cpItem = progress.contentProgress.find(
        (p) =>
          String(p.contentId) === String(bookId) &&
          p.contentType === 'book'
      );
      if (cpItem?.status === 'completed') continue;

      console.log(
        `  [book] ${book?.title || bookId} readings=${readingCount}/${required} status=${cpItem?.status || 'missing'}`
      );
      if (dryRun) {
        healed += 1;
        continue;
      }
      try {
        await updateContentProgress(childId, course._id, bookId, 'book');
        healed += 1;
      } catch (err) {
        console.error(`    failed: ${err.message}`);
      }
    }
  }
  return healed;
}

async function healApprovedAudioForChild(childId, { dryRun }) {
  const approved = await AudioAssignmentProgress.find({
    child: childId,
    status: 'approved',
  }).lean();
  let healed = 0;

  for (const row of approved) {
    const audioId = row.audioAssignment;
    const courses = await Course.find({
      isArchived: { $ne: true },
      contents: {
        $elemMatch: { contentId: audioId, contentType: 'audioAssignment' },
      },
    });

    for (const course of courses) {
      const progress = await CourseProgress.findOne({ child: childId, course: course._id });
      const cpItem = progress?.contentProgress?.find(
        (p) =>
          String(p.contentId) === String(audioId) &&
          p.contentType === 'audioAssignment'
      );
      if (cpItem?.status === 'completed') continue;

      console.log(
        `  [audio approved] course=${course.title} aa=${audioId} status=${cpItem?.status || 'missing'}`
      );
      if (dryRun) {
        healed += 1;
        continue;
      }
      try {
        await updateContentProgress(childId, course._id, audioId, 'audioAssignment');
        healed += 1;
      } catch (err) {
        console.error(`    failed: ${err.message}`);
      }
    }
  }
  return healed;
}

async function approveSubmittedForChild(childId, reviewerId, { dryRun }) {
  const {
    reviewAudioAssignmentSubmission,
  } = require('../services/audioAssignmentProgress.services');

  const submitted = await AudioAssignmentProgress.find({
    child: childId,
    status: 'submitted',
    recordedAudio: { $ne: null },
  });

  let approved = 0;
  for (const row of submitted) {
    console.log(
      `  [audio submit→approve] aa=${row.audioAssignment} submittedAt=${row.submittedAt || row.updatedAt}`
    );
    if (dryRun) {
      approved += 1;
      continue;
    }
    try {
      await reviewAudioAssignmentSubmission({
        childId,
        audioAssignmentId: row.audioAssignment,
        reviewerUserId: reviewerId,
        decision: 'approved',
        feedback: 'Healed by healCourseContentCompletion script',
      });
      approved += 1;
    } catch (err) {
      console.error(`    failed: ${err.message}`);
    }
  }
  return approved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids');
  console.log(`[healCourseContentCompletion] connected dryRun=${args.dryRun}`);

  const children = await resolveChildren(args.child);
  if (!children.length) {
    console.error('No children matched', args.child || '(all)');
    process.exit(1);
  }

  let reviewer = await User.findOne({ role: 'admin' }).select('_id email').lean();
  if (!reviewer) {
    reviewer = await User.findOne({ role: 'teacher' }).select('_id email').lean();
  }

  let totals = { books: 0, audioSync: 0, audioApproved: 0 };

  for (const child of children) {
    console.log(`\nChild ${child.displayName} (${child._id})`);
    totals.books += await healBooksForChild(child._id, args);
    totals.audioSync += await healApprovedAudioForChild(child._id, args);

    if (args.approveSubmitted) {
      if (!reviewer) {
        console.error('  No admin/teacher user to set as reviewer — skip approve-submitted');
      } else {
        totals.audioApproved += await approveSubmittedForChild(child._id, reviewer._id, args);
      }
    }

    // Recalc % for courses this child has progress on
    if (!args.dryRun) {
      const courseIds = await CourseProgress.distinct('course', { child: child._id });
      for (const courseId of courseIds) {
        try {
          await recalculateProgressForCourse(courseId);
        } catch (_) {
          /* non-fatal */
        }
      }
    }
  }

  console.log('\nDone:', totals);
  // Allow scheduled badge updates to finish before disconnect
  await new Promise((r) => setTimeout(r, 1500));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(err);
    try {
      await mongoose.disconnect();
    } catch (_) {
      /* ignore */
    }
    process.exit(1);
  });
}

module.exports = { parseArgs, resolveChildren };
