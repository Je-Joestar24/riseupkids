/**
 * Uploads for the admin Experiences, one file each, kept in memory and sent on to storage by the service:
 *
 *   coverImage, printableImage   a picture: JPG, PNG or WebP, up to 8 MB
 *   printableFile                the printable itself: a PDF or Word document (DOC, DOCX), up to 20 MB
 *
 * A request that is not multipart (plain JSON) passes straight through. Upload problems are answered here as
 * clear 4xx messages instead of reaching the central handler as a 500:
 *
 *   413 FILE_TOO_LARGE        too big (the message says which limit)
 *   415 UNSUPPORTED_FILE_TYPE not one of the allowed types, or the file is not what its name and type say
 *   400 UNEXPECTED_FILE       a file in a field that does not exist, or more than one in a field
 *   400 INVALID_FORM          the form data itself could not be read
 */
const multer = require('multer');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const IMAGE_FIELDS = ['coverImage', 'printableImage'];
const DOCUMENT_FIELD = 'printableFile';
const FIELDS = [...IMAGE_FIELDS, DOCUMENT_FIELD];

/** The printable's file types: what the browser calls them, the ending of the name, and how the file begins. */
const DOCUMENT_TYPES = Object.freeze([
  { mime: 'application/pdf', extension: '.pdf', kind: 'pdf' },
  { mime: 'application/msword', extension: '.doc', kind: 'doc' },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx', kind: 'docx' },
]);
const ALLOWED_DOCUMENT_TYPES = DOCUMENT_TYPES.map((type) => type.mime);

const IMAGE_MESSAGE = 'Pictures must be JPG, PNG or WebP.';
const DOCUMENT_MESSAGE = 'The printable must be a PDF or a Word document (DOC or DOCX).';
const SIGNATURE_MESSAGE = 'That file does not look like a PDF or Word document. Check it opens, then try again.';

const extensionOf = (name) => {
  const match = /\.[^./\\]+$/.exec(String(name || ''));
  return match ? match[0].toLowerCase() : '';
};

const documentTypeOf = (file) =>
  DOCUMENT_TYPES.find((type) => type.mime === file.mimetype && type.extension === extensionOf(file.originalname));

/** Does the file begin the way its kind of file begins? (A name and a type can be anything; the first bytes cannot.) */
function hasSignature(buffer, kind) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  if (kind === 'pdf') return buffer.subarray(0, 1024).includes('%PDF-');
  if (kind === 'docx') return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04; // a zip
  if (kind === 'doc') return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  return false;
}

const parser = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    if (!FIELDS.includes(file.fieldname)) {
      const error = new Error(`Unexpected file field: ${file.fieldname}`);
      error.code = 'UNEXPECTED_FILE';
      return cb(error, false);
    }
    if (file.fieldname === DOCUMENT_FIELD) {
      if (!documentTypeOf(file)) {
        const error = new Error(DOCUMENT_MESSAGE);
        error.code = 'UNSUPPORTED_FILE_TYPE';
        return cb(error, false);
      }
      return cb(null, true);
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      const error = new Error(IMAGE_MESSAGE);
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(error, false);
    }
    return cb(null, true);
  },
  // The larger limit is for the printable; pictures and the printable are held to their exact limits after they
  // arrive (one byte of room here, so a file of exactly the limit is not cut short by the parser).
  limits: { fileSize: MAX_DOCUMENT_BYTES + 1, files: FIELDS.length, fields: 20 },
}).fields(FIELDS.map((name) => ({ name, maxCount: 1 })));

function answer(res, status, code, message) {
  return res.status(status).json({ success: false, code, message });
}

const tooLarge = (res, field) =>
  field === DOCUMENT_FIELD
    ? answer(res, 413, 'FILE_TOO_LARGE', 'The file is too large. The maximum size is 20 MB.')
    : answer(res, 413, 'FILE_TOO_LARGE', 'The picture is too large. The maximum size is 8 MB.');

function uploadExperience(req, res, next) {
  parser(req, res, (error) => {
    if (error) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return tooLarge(res, error.field);
        case 'LIMIT_UNEXPECTED_FILE':
        case 'LIMIT_FILE_COUNT':
        case 'UNEXPECTED_FILE':
          return answer(res, 400, 'UNEXPECTED_FILE', 'Send one cover picture, one printable picture and one printable file at most.');
        case 'UNSUPPORTED_FILE_TYPE':
          return answer(res, 415, 'UNSUPPORTED_FILE_TYPE', error.message);
        case 'LIMIT_FIELD_COUNT':
        case 'LIMIT_FIELD_KEY':
        case 'LIMIT_FIELD_VALUE':
        case 'LIMIT_PART_COUNT':
          return answer(res, 400, 'INVALID_FORM', 'The form data is not valid.');
        default:
          // A broken multipart body (cut off, no boundary): the client's upload, not a server fault.
          return answer(res, 400, 'INVALID_FORM', 'The upload could not be read. Please try again.');
      }
    }

    const files = req.files || {};
    for (const name of IMAGE_FIELDS) {
      const file = files[name] && files[name][0];
      if (file && file.size > MAX_IMAGE_BYTES) return tooLarge(res, name);
    }
    const document = files[DOCUMENT_FIELD] && files[DOCUMENT_FIELD][0];
    if (document) {
      if (document.size > MAX_DOCUMENT_BYTES) return tooLarge(res, DOCUMENT_FIELD);
      const type = documentTypeOf(document);
      if (!type || !hasSignature(document.buffer, type.kind)) return answer(res, 415, 'UNSUPPORTED_FILE_TYPE', SIGNATURE_MESSAGE);
    }
    return next();
  });
}

module.exports = {
  uploadExperience,
  MAX_IMAGE_BYTES,
  MAX_DOCUMENT_BYTES,
  ALLOWED_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_TYPES,
  hasSignature,
};
