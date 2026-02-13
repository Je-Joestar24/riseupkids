/**
 * HTML5 Handler Routes
 *
 * Upload and host HTML5 packages only. No SCORM/Book coupling.
 * - POST /upload — multipart, one HTML5 zip → returns { id, launchUrl, entryPoint }
 * - GET /:id/launch — returns { launchUrl, entryPoint }
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const html5handlerController = require('../controllers/html5handler.controller');

const router = express.Router();

const uploadHtml5Zip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      path.extname(file.originalname || '').toLowerCase() === '.zip';
    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error('File must be a ZIP'), false);
    }
  },
}).single('file');

router.post('/upload', protect, (req, res, next) => {
  uploadHtml5Zip(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid file' });
    }
    next();
  });
}, html5handlerController.upload);

router.get('/:id/launch', html5handlerController.getLaunchUrl);

module.exports = router;
