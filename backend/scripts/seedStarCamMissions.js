const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { StarCamCategory, StarCamMission, Media, User } = require('../models');
const { isStarCamCategoryActiveDoc } = require('../utils/starCamCategoryQuery');

dotenv.config();

const MISSIONS_PER_CATEGORY = 3;
const VOCAB_PER_MISSION = 7;
const READING_DETECTABLE_OBJECTS = ['headphones', 'book', 'pencil', 'pen', 'notebook', 'eye glasses', 'shoe'];

const DEFAULT_WORD_POOL = [
  'book',
  'pencil',
  'notebook',
  'leaf',
  'flower',
  'cup',
  'plate',
  'spoon',
  'guitar',
  'drum',
  'microphone',
  'headphones',
  'banana',
  'apple',
  'ball',
  'clock',
  'chair',
  'table',
  'bag',
  'bottle',
  'toy',
  'shoe',
  'hat',
  'tree',
  'rock',
  'cloud',
  'sun',
  'star',
];

function normalizeWord(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function titleCase(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function shuffle(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickWords(categoryTargets = [], count = VOCAB_PER_MISSION) {
  const normalizedTargets = categoryTargets.map(normalizeWord).filter(Boolean);
  const merged = Array.from(new Set([...normalizedTargets, ...DEFAULT_WORD_POOL]));
  const picked = shuffle(merged).slice(0, count);
  if (picked.length >= count) return picked;
  const fallback = DEFAULT_WORD_POOL.filter((w) => !picked.includes(w)).slice(0, count - picked.length);
  return [...picked, ...fallback];
}

function getCategoryWordPool(category = {}) {
  if (normalizeWord(category?.key) === 'reading') {
    return READING_DETECTABLE_OBJECTS.map(normalizeWord);
  }
  return category?.targets || [];
}

function isReadingCategory(category = {}) {
  return normalizeWord(category?.key) === 'reading';
}

function getSeedFileStats(filePath) {
  const stat = fs.statSync(filePath);
  return {
    size: stat.size,
    filePath: filePath.replace(/\\/g, '/'),
  };
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copySeedFileToUploads({ sourcePath, destinationPath }) {
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

async function ensureSeedMedia({
  type,
  title,
  sourceFilePath,
  destinationRelativeUrl,
  mimeType,
  uploadedBy,
  isPublished = true,
  isActive = true,
}) {
  const backendRoot = path.resolve(__dirname, '..');
  const destinationAbsolutePath = path.join(backendRoot, destinationRelativeUrl.replace(/^\//, ''));
  copySeedFileToUploads({ sourcePath: sourceFilePath, destinationPath: destinationAbsolutePath });
  const stat = getSeedFileStats(destinationAbsolutePath);

  const media = await Media.findOneAndUpdate(
    { title },
    {
      $set: {
        type,
        filePath: stat.filePath,
        url: destinationRelativeUrl,
        mimeType,
        size: stat.size,
        uploadedBy,
        isPublished,
        isActive,
      },
      $setOnInsert: {
        title,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return media._id;
}

async function resolveSeederUserId() {
  const existingUser = await User.findOne({ isActive: true }).select('_id').lean();
  if (!existingUser?._id) {
    throw new Error('No active user found for uploadedBy. Seed users first (npm run seed).');
  }
  return existingUser._id;
}

function buildMissionPayload({
  category,
  missionNumber,
  createdBy,
  missionImageId,
  vocabImageId,
  vocabAudioId,
  questionAudioId,
  sampleVideoId,
}) {
  const words = isReadingCategory(category)
    ? getCategoryWordPool(category).slice(0, VOCAB_PER_MISSION)
    : pickWords(getCategoryWordPool(category), VOCAB_PER_MISSION);
  const vocab = words.map((word, idx) => {
    const readable = titleCase(word.replace(/_/g, ' '));
    return {
      word: readable,
      displayText: readable,
      target: normalizeWord(word),
      image: vocabImageId,
      audio: vocabAudioId,
      // Scan question audio uses a separate slot from the main guide/pronunciation audio.
      introAudio: questionAudioId,
      // Required by schema for published missions; keep placeholders until real audio is uploaded.
      tryAgainAudio: vocabAudioId,
      successAudio: vocabAudioId,
      pronunciationVideo: sampleVideoId,
      sortOrder: idx,
    };
  });

  const items = words.map((word, idx) => {
    const readable = titleCase(word.replace(/_/g, ' '));
    return {
      target: normalizeWord(word),
      prompt: `Is this a ${readable.toLowerCase()}?`,
      questionText: `Is this a ${readable.toLowerCase()}?`,
      questionAudio: questionAudioId,
      success: `Great! You found the ${readable.toLowerCase()}!`,
      successText: `Great! You found the ${readable.toLowerCase()}!`,
      successAudio: vocabAudioId,
      fail: `Not quite. Try to find the ${readable.toLowerCase()}.`,
      tryAgainText: `Not quite. Try to find the ${readable.toLowerCase()}.`,
      tryAgainAudio: vocabAudioId,
      sortOrder: idx,
    };
  });

  return {
    missionId: `${category.key}_seed_${missionNumber}`,
    title: `${category.name} Mission ${missionNumber}`,
    status: 'published',
    category: category._id,
    introText: `Welcome to ${category.name} Mission ${missionNumber}. Find all 7 objects and complete your Star Cam challenge!`,
    missionImage: missionImageId,
    introImage: missionImageId,
    videoEnabled: true,
    introVideo: sampleVideoId,
    missionShortVideo: sampleVideoId,
    vocab,
    items,
    rewardImage: missionImageId,
    rewardAudio: vocabAudioId,
    rewardVideo: sampleVideoId,
    rewardTitle: 'Mission Accomplished!',
    rewardSubtitle: 'Great job, Explorer!',
    createdBy,
    updatedBy: createdBy,
  };
}

async function seedStarCamMissions() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids';
  const backendRoot = path.resolve(__dirname, '..');
  const seedFiles = {
    missionImage: path.join(backendRoot, 'assets', 'seeds', 'mission_image_temp.png'),
    vocabImage: path.join(backendRoot, 'assets', 'seeds', 'vocabulary_image_temp.png'),
    vocabAudio: path.join(backendRoot, 'assets', 'seeds', 'vocabulary_audio_temp.mp3'),
    questionAudio: path.join(backendRoot, 'assets', 'seeds', 'vocabulary_audio_temp.mp3'),
    sampleVideo: path.join(backendRoot, 'assets', 'seeds', 'sample_video.mp4'),
  };

  try {
    for (const file of Object.values(seedFiles)) {
      if (!fs.existsSync(file)) {
        throw new Error(`Seed file not found: ${file}`);
      }
    }

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`[StarCamMissionSeeder] MongoDB Connected: ${conn.connection.host}`);

    const rawCategories = await StarCamCategory.find({})
      .select('_id key name targets isActive')
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const categories = rawCategories.filter((c) => isStarCamCategoryActiveDoc(c));

    if (!categories.length) {
      throw new Error('No active StarCam categories found. Run seed:starcam-categories first.');
    }

    const seederUserId = await resolveSeederUserId();
    const [missionImageId, vocabImageId, vocabAudioId, questionAudioId, sampleVideoId] = await Promise.all([
      ensureSeedMedia({
        type: 'image',
        title: 'starcam_seed_mission_image_temp',
        sourceFilePath: seedFiles.missionImage,
        destinationRelativeUrl: '/uploads/media/images/starcam_seed_mission_image_temp.png',
        mimeType: 'image/png',
        uploadedBy: seederUserId,
      }),
      ensureSeedMedia({
        type: 'image',
        title: 'starcam_seed_vocabulary_image_temp',
        sourceFilePath: seedFiles.vocabImage,
        destinationRelativeUrl: '/uploads/media/images/starcam_seed_vocabulary_image_temp.png',
        mimeType: 'image/png',
        uploadedBy: seederUserId,
      }),
      ensureSeedMedia({
        type: 'audio',
        title: 'starcam_seed_vocabulary_audio_temp',
        sourceFilePath: seedFiles.vocabAudio,
        destinationRelativeUrl: '/uploads/media/audio/starcam_seed_vocabulary_audio_temp.mp3',
        mimeType: 'audio/mpeg',
        uploadedBy: seederUserId,
      }),
      ensureSeedMedia({
        type: 'audio',
        title: 'starcam_seed_scan_question_audio_temp',
        sourceFilePath: seedFiles.questionAudio,
        destinationRelativeUrl: '/uploads/media/audio/starcam_seed_scan_question_audio_temp.mp3',
        mimeType: 'audio/mpeg',
        uploadedBy: seederUserId,
      }),
      ensureSeedMedia({
        type: 'video',
        title: 'starcam_seed_sample_video',
        sourceFilePath: seedFiles.sampleVideo,
        destinationRelativeUrl: '/uploads/media/videos/starcam_seed_sample_video.mp4',
        mimeType: 'video/mp4',
        uploadedBy: seederUserId,
      }),
    ]);

    let created = 0;
    let updated = 0;

    for (const category of categories) {
      for (let missionNumber = 1; missionNumber <= MISSIONS_PER_CATEGORY; missionNumber += 1) {
        const payload = buildMissionPayload({
          category,
          missionNumber,
          createdBy: seederUserId,
          missionImageId,
          vocabImageId,
          vocabAudioId,
          questionAudioId,
          sampleVideoId,
        });

        const existing = await StarCamMission.findOne({ missionId: payload.missionId }).select('_id').lean();
        await StarCamMission.findOneAndUpdate(
          { missionId: payload.missionId },
          { $set: payload },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
            context: 'query',
          }
        );

        if (existing?._id) {
          updated += 1;
          console.log(`[StarCamMissionSeeder] Updated: ${payload.missionId}`);
        } else {
          created += 1;
          console.log(`[StarCamMissionSeeder] Created: ${payload.missionId}`);
        }
      }
    }

    const totalPublished = await StarCamMission.countDocuments({ status: 'published' });
    console.log(
      `[StarCamMissionSeeder] Done. Created=${created}, Updated=${updated}, PublishedTotal=${totalPublished}, Categories=${categories.length}`
    );
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[StarCamMissionSeeder] Failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedStarCamMissions();
