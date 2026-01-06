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
 * Handles file uploads for activities, books, and other content
 * Files are stored locally in the uploads directory
 */

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../uploads/activities'),
    path.join(__dirname, '../uploads/activities/scorm'),
    path.join(__dirname, '../uploads/media/images'),
    path.join(__dirname, '../uploads/media/videos'),
    path.join(__dirname, '../uploads/media/audio'),
    path.join(__dirname, '../uploads/media/other'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../uploads/media');
    
    // Determine subdirectory based on file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(uploadPath, 'images');
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = path.join(uploadPath, 'videos');
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath = path.join(uploadPath, 'audio');
    } else {
      uploadPath = path.join(uploadPath, 'other');
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename using date/time formatter
    cb(null, generateFileName(file.originalname));
  },
});

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

// Storage for SCORM files
const scormStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/activities/scorm');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename using date/time formatter
    cb(null, generateFileName(file.originalname));
  },
});

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
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      let uploadPath;
      
      if (file.fieldname === 'scormFile') {
        uploadPath = path.join(__dirname, '../uploads/activities/scorm');
      } else if (file.fieldname === 'coverImage') {
        uploadPath = path.join(__dirname, '../uploads/media/images');
      } else {
        uploadPath = path.join(__dirname, '../uploads/media/other');
      }

      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Generate unique filename using date/time formatter
      cb(null, generateFileName(file.originalname));
    },
  }),
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
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, '../uploads/media/images');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Generate unique filename using date/time formatter
      cb(null, generateFileName(file.originalname));
    },
  }),
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
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      let uploadPath;
      
      if (file.fieldname === 'scormFile') {
        uploadPath = path.join(__dirname, '../uploads/activities/scorm');
      } else if (file.fieldname === 'coverImage') {
        uploadPath = path.join(__dirname, '../uploads/media/images');
      } else {
        uploadPath = path.join(__dirname, '../uploads/media/other');
      }

      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, generateFileName(file.originalname));
    },
  }),
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
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, '../uploads/media/images');
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, generateFileName(file.originalname));
    },
  }),
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
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      let uploadPath;
      
      if (file.fieldname === 'videoFile') {
        uploadPath = path.join(__dirname, '../uploads/media/videos');
      } else if (file.fieldname === 'scormFile') {
        uploadPath = path.join(__dirname, '../uploads/activities/scorm');
      } else if (file.fieldname === 'coverImage') {
        uploadPath = path.join(__dirname, '../uploads/media/images');
      } else {
        uploadPath = path.join(__dirname, '../uploads/media/other');
      }

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, generateFileName(file.originalname));
    },
  }),
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
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, '../uploads/media/images');
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, generateFileName(file.originalname));
    },
  }),
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
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      let uploadPath;
      
      if (file.fieldname === 'referenceAudio') {
        uploadPath = path.join(__dirname, '../uploads/media/audio');
      } else if (file.fieldname === 'coverImage') {
        uploadPath = path.join(__dirname, '../uploads/media/images');
      } else {
        uploadPath = path.join(__dirname, '../uploads/media/other');
      }

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, generateFileName(file.originalname));
    },
  }),
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'referenceAudio') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Reference audio must be an audio file'), false);
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
  { name: 'coverImage', maxCount: 1 },
]);

// Middleware for audio assignment update (cover image only, no reference audio)
const uploadAudioAssignmentUpdate = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, '../uploads/media/images');
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, generateFileName(file.originalname));
    },
  }),
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
};

