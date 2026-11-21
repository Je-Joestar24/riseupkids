const express = require('express');

const { protect, authorize } = require('../middleware/auth');
const { requireAccessArea, requireAnyAccessArea } = require('../middleware/accessArea');
const { upload } = require('../middleware/upload');
const {
  createCmsBook,
  listCmsBooks,
  getCmsBookById,
  updateCmsBook,
  publishCmsBook,
  unpublishCmsBook,
  archiveCmsBook,
  deleteCmsBook,
  uploadCmsBookMedia,
} = require('../controllers/cmsBookAdmin.controller');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'teacher', 'content_creator'));

// Writes need the Built-in Books area. The two reads (list, one book) are also open to a creator with the
// Contents area, because the Contents page's "Select built-in book" drawer reads them.
const builtInBooksOnly = requireAccessArea('built_in_books');
const builtInBooksOrContents = requireAnyAccessArea('built_in_books', 'contents');

router.post('/media', builtInBooksOnly, upload.single('file'), uploadCmsBookMedia);
router.post('/', builtInBooksOnly, createCmsBook);
// Query status=published (and includeArchived=false) to populate admin UI pickers for linking Book → CmsBook.
router.get('/', builtInBooksOrContents, listCmsBooks);
router.get('/:id', builtInBooksOrContents, getCmsBookById);
router.put('/:id', builtInBooksOnly, updateCmsBook);
router.patch('/:id/publish', builtInBooksOnly, publishCmsBook);
router.patch('/:id/unpublish', builtInBooksOnly, unpublishCmsBook);
router.patch('/:id/archive', builtInBooksOnly, archiveCmsBook);
router.delete('/:id', builtInBooksOnly, deleteCmsBook);

module.exports = router;
