/**
 * Moves the Strawberry Banana Smoothie experience (until now written into the app's code) into the
 * database, so it becomes the first entry of the admin-managed list.
 *
 *   npm run seed:experience-smoothie
 *
 * Safe to run more than once: if an experience with this title already exists nothing is changed.
 * Needs at least one admin user (the creator of the entry). The cover and printable pictures are not
 * created here: the admin uploads them in the editor.
 *
 * The two videos are the production ones (the same two as EXPERIENCE_VIDEOS_PT, in the same order).
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Experience = require('../models/Experience');
const User = require('../models/User');
const { normalizeBunnyEmbedUrl } = require('../utils/experienceValidation.util');

const SMOOTHIE = Object.freeze({
  title: 'Strawberry Banana Smoothie',
  videos: [
    {
      title: 'Vocabulary, verbs and pronunciation',
      embedUrl: 'https://iframe.mediadelivery.net/embed/660084/fbf9d1d1-5294-4375-8abf-a1529c31c496',
    },
    {
      title: 'The story',
      embedUrl: 'https://iframe.mediadelivery.net/embed/660084/ea5f0749-8fde-43e5-851b-ec9e5af9e12a',
    },
  ],
  printable: {
    link: 'https://riseup.kids/downloads/strawberry-banana-smoothie-recipe.pdf',
    button: 'Print recipe here',
  },
});

/**
 * @param {{ createdBy?: unknown, log?: { info: Function } }} [options] `createdBy` defaults to the first admin
 * @returns {Promise<{ created: boolean, uuid: string }>}
 */
async function seedSmoothieExperience({ createdBy, log = console } = {}) {
  const existing = await Experience.findOne({ title: SMOOTHIE.title }).select('uuid').lean();
  if (existing) {
    log.info(`[seed] "${SMOOTHIE.title}" already exists (${existing.uuid}); nothing changed.`);
    return { created: false, uuid: existing.uuid };
  }

  let owner = createdBy;
  if (!owner) {
    const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
    if (!admin) throw new Error('No admin user found. Create an admin first, then run this again.');
    owner = admin._id;
  }

  // The links are checked with the same rule the admin screen uses, so the seed can never store a bad one.
  const videos = SMOOTHIE.videos.map((video) => ({ title: video.title, embedUrl: normalizeBunnyEmbedUrl(video.embedUrl) }));

  const last = await Experience.findOne().sort({ order: -1 }).select('order').lean();
  const doc = await Experience.create({
    title: SMOOTHIE.title,
    description: '',
    videos,
    printable: { ...SMOOTHIE.printable, image: null },
    order: ((last && last.order) || 0) + 1,
    isPublished: true,
    publishedAt: new Date(),
    createdBy: owner,
    updatedBy: owner,
  });
  log.info(`[seed] Created "${SMOOTHIE.title}" (${doc.uuid}).`);
  return { created: true, uuid: doc.uuid };
}

async function main() {
  dotenv.config();
  // The same connection string the server uses.
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids');
  try {
    await seedSmoothieExperience();
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[seed] Failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { seedSmoothieExperience, SMOOTHIE };
