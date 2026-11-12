/**
 * Picture upload for the admin Experiences: `coverImage` and `printableImage`, one file each, JPG, PNG or
 * WebP, up to 8 MB. Kept in memory and sent on to storage by the service.
 *
 * A request that is not multipart (plain JSON) passes straight through. Upload problems are answered
 * here as clear 4xx messages instead of reaching the central handler as a 500.
 */
const multer = require('multer');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const FIELDS = ['coverImage', 'printableImage'];

const parser = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    if (!FIELDS.includes(file.fieldname)) {
      const error = new Error(`Unexpected file field: ${file.fieldname}`);
      error.code = 'UNEXPECTED_FILE';
      return cb(error, false);
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      const error = new Error('Pictures must be JPG, PNG or WebP.');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(error, false);
    }
    return cb(null, true);
  },
  limits: { fileSize: MAX_IMAGE_BYTES, files: FIELDS.length, fields: 20 },
}).fields(FIELDS.map((name) => ({ name, maxCount: 1 })));

function answer(res, status, code, message) {
  return res.status(status).json({ success: false, code, message });
}

function uploadExperience(req, res, next) {
  parser(req, res, (error) => {
    if (!error) return next();
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return answer(res, 413, 'FILE_TOO_LARGE', 'The picture is too large. The maximum size is 8 MB.');
      case 'LIMIT_UNEXPECTED_FILE':
      case 'LIMIT_FILE_COUNT':
      case 'UNEXPECTED_FILE':
        return answer(res, 400, 'UNEXPECTED_FILE', 'Send one cover picture and one printable picture at most.');
      case 'UNSUPPORTED_FILE_TYPE':
        return answer(res, 415, 'UNSUPPORTED_FILE_TYPE', 'Pictures must be JPG, PNG or WebP.');
      case 'LIMIT_FIELD_COUNT':
      case 'LIMIT_FIELD_KEY':
      case 'LIMIT_FIELD_VALUE':
      case 'LIMIT_PART_COUNT':
        return answer(res, 400, 'INVALID_FORM', 'The form data is not valid.');
      default:
        // A broken multipart body (cut off, no boundary): the client's upload, not a server fault.
        return answer(res, 400, 'INVALID_FORM', 'The upload could not be read. Please try again.');
    }
  });
}

module.exports = { uploadExperience, MAX_IMAGE_BYTES, ALLOWED_TYPES };
