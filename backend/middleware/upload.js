const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Generate filename with date/time formatter
 * Format: YYYYMMDD-HHMMSS-random.ext
 */
const generateFileName = (originalname) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.round(Math.random() * 1E9);
  
  const ext = path.extname(originalname);
  const dateTime = `${year}${month}${day}-${hours}${minutes}${seconds}`;
  
  return `${dateTime}-${random}${ext}`;
};

/**
 * File Upload Middleware
 *
 * Uses memory storage; files are uploaded to S3 by services (s3.service.js).
 * CloudFront base URL from env: AWS_S3_BASE_URL
 */

// Memory storage for S3 upload path (services call s3Service.uploadFileFromMulter)
const memoryStorage = multer.memoryStorage();

// Ensure upload directories exist (for temp/extraction when needed, e.g. SCORM)
const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../uploads/activities'),
    path.join(__dirname, '../uploads/activities/scorm'),
    path.join(__dirname, '../uploads/scorm'),
    path.join(__dirname, '../uploads/scorm/audio-assignments'),
    path.join(__dirname, '../uploads/scorm/chants'),
    path.join(__dirname, '../uploads/html5'),
    path.join(__dirname, '../uploads/media/images'),
    path.join(__dirname, '../uploads/media/videos'),
    path.join(__dirname, '../uploads/media/audio'),
    path.join(__dirname, '../uploads/media/other'),
    path.join(__dirname, '../uploads/courses'),
    path.join(__dirname, '../uploads/kids-wall'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

const storage = memoryStorage;

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/mp4',       // Android (expo-av m4a/AAC)
    'audio/x-caf',     // iOS (expo-av Core Audio Format)
    'audio/x-m4a',     // Alternative m4a
    'audio/3gpp',      // Some Android devices (3gp)
    'audio/amr',       // Some Android devices (AMR)
    // SCORM files (ZIP)
    'application/zip',
    'application/x-zip-compressed',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: images (jpg, png, gif, webp), videos (mp4, mpeg, mov, avi, webm), audio (mp3, wav, ogg, aac), SCORM (zip)`
      ),
      false
    );
  }
};

// File filter for SCORM files only
const scormFileFilter = (req, file, cb) => {
  // Check if it's a ZIP file
  const isZip = file.mimetype === 'application/zip' || 
                file.mimetype === 'application/x-zip-compressed' ||
                path.extname(file.originalname).toLowerCase() === '.zip';
  
  if (isZip) {
    cb(null, true);
  } else {
    cb(new Error('SCORM file must be a ZIP file'), false);
  }
};

const scormStorage = memoryStorage;

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Middleware for multiple files (for activity media)
const uploadActivityMedia = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 },
  { name: 'audio', maxCount: 5 },
]);

// Configure multer for SCORM files
const uploadScorm = multer({
  storage: scormStorage,
  fileFilter: scormFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size for SCORM
  },
});

// Middleware for activity uploads (SCORM file + cover image)
const uploadActivity = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'scormFile') {
      // SCORM file must be ZIP
      const isZip = file.mimetype === 'application/zip' || 
                    file.mimetype === 'application/x-zip-compressed' ||
                    path.extname(file.originalname).toLowerCase() === '.zip';
      if (isZip) {
        cb(null, true);
      } else {
        cb(new Error('SCORM file must be a ZIP file'), false);
      }
    } else if (file.fieldname === 'coverImage') {
      // Cover image must be an image
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
}).fields([
  { name: 'scormFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for activity update (cover image only, no SCORM file)
const uploadActivityUpdate = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    // Only allow cover image
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(new Error('Only cover image is allowed for updates'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for images
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for book uploads (SCORM file + cover image) - same as activity
const uploadBook = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'scormFile') {
      const isZip = file.mimetype === 'application/zip' || 
                    file.mimetype === 'application/x-zip-compressed' ||
                    path.extname(file.originalname).toLowerCase() === '.zip';
      if (isZip) {
        cb(null, true);
      } else {
        cb(new Error('SCORM file must be a ZIP file'), false);
      }
    } else if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
}).fields([
  { name: 'scormFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for book update (cover image only, no SCORM file)
const uploadBookUpdate = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(new Error('Only cover image is allowed for updates'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for images
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for video uploads (video file + SCORM file + cover image)
const uploadVideo = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'videoFile') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Video file must be a video file'), false);
      }
    } else if (file.fieldname === 'scormFile') {
      const isZip = file.mimetype === 'application/zip' || 
                    file.mimetype === 'application/x-zip-compressed' ||
                    path.extname(file.originalname).toLowerCase() === '.zip';
      if (isZip) {
        cb(null, true);
      } else {
        cb(new Error('SCORM file must be a ZIP file'), false);
      }
    } else if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
}).fields([
  { name: 'videoFile', maxCount: 1 },
  { name: 'scormFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for video update (cover image only, no video/SCORM files)
const uploadVideoUpdate = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(new Error('Only cover image is allowed for updates'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for images
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for audio assignment uploads (reference audio + cover image)
const uploadAudioAssignment = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'referenceAudio') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Reference audio must be an audio file'), false);
      }
    } else if (file.fieldname === 'instructionVideo') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Instruction video must be a video file'), false);
      }
    } else if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
}).fields([
  { name: 'referenceAudio', maxCount: 1 },
  { name: 'instructionVideo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for audio assignment update (cover image + instruction video, no reference audio)
const uploadAudioAssignmentUpdate = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else if (file.fieldname === 'instructionVideo') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Instruction video must be a video file'), false);
      }
    } else {
      cb(new Error('Only coverImage and instructionVideo are allowed for updates'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size (supports instruction videos)
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'instructionVideo', maxCount: 1 },
]);

// Middleware for course cover image upload
const uploadCourse = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(new Error('Only cover image is allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for images
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for chant creation (audio, scormFile, coverImage - all optional)
const uploadChant = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'audio') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Audio must be an audio file'), false);
      }
    } else if (file.fieldname === 'instructionVideo') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Instruction video must be a video file'), false);
      }
    } else if (file.fieldname === 'scormFile') {
      const isZip = file.mimetype === 'application/zip' || 
                    file.mimetype === 'application/x-zip-compressed' ||
                    path.extname(file.originalname).toLowerCase() === '.zip';
      if (isZip) {
        cb(null, true);
      } else {
        cb(new Error('SCORM file must be a ZIP file'), false);
      }
    } else if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'instructionVideo', maxCount: 1 },
  { name: 'scormFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for chant update (cover image + instruction video only, no audio/scormFile)
const uploadChantUpdate = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else if (file.fieldname === 'instructionVideo') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Instruction video must be a video file'), false);
      }
    } else {
      cb(new Error('Only coverImage and instructionVideo are allowed for updates'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size (supports instruction videos)
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'instructionVideo', maxCount: 1 },
]);

// Middleware for child recorded audio submissions (single audio file)
// Field name: recordedAudio
const uploadRecordedAudio = upload.single('recordedAudio');

// Middleware for explore content uploads (video file + cover photo for all video types)
const uploadExplore = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'videoFile') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Video file must be a video file'), false);
      }
    } else if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(new Error(`Unknown field: ${file.fieldname}`), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
}).fields([
  { name: 'videoFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for explore content update (cover photo only, no video file)
const uploadExploreUpdate = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be an image file'), false);
      }
    } else {
      cb(new Error('Only cover image is allowed for updates'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for images
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for KidsWall image uploads
const uploadKidsWallImage = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    // Only allow image files
    const allowedImageMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error('Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed'),
        false
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Middleware for program printable uploads (PDF + optional cover image)
// - Field: pdfFile (application/pdf)
// - Field: coverImage (image/*)
const uploadProgramPrintable = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'pdfFile') {
      if (file.mimetype === 'application/pdf') return cb(null, true);
      return cb(new Error('Printable must be a PDF file'), false);
    }

    if (file.fieldname === 'coverImage') {
      if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
      return cb(new Error('Cover image must be an image file'), false);
    }

    return cb(new Error(`Unknown field: ${file.fieldname}`), false);
  },
  limits: {
    // PDFs tend to be small; allow up to 50MB
    fileSize: 50 * 1024 * 1024,
  },
}).fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for Star Cam vocab uploads (one image + one audio)
const uploadStarCamVocab = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'image') {
      if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
      return cb(new Error('image must be an image file'), false);
    }
    if (file.fieldname === 'audio') {
      if (file.mimetype && file.mimetype.startsWith('audio/')) return cb(null, true);
      return cb(new Error('audio must be an audio file'), false);
    }
    return cb(new Error(`Unknown field: ${file.fieldname}`), false);
  },
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);

module.exports = {
  upload,
  uploadActivityMedia,
  uploadScorm,
  uploadActivity,
  uploadActivityUpdate,
  uploadBook,
  uploadBookUpdate,
  uploadVideo,
  uploadVideoUpdate,
  uploadAudioAssignment,
  uploadAudioAssignmentUpdate,
  uploadChant,
  uploadChantUpdate,
  uploadRecordedAudio,
  uploadCourse,
  uploadExplore,
  uploadExploreUpdate,
  uploadKidsWallImage,
  uploadProgramPrintable,
  uploadStarCamVocab,
};

