const express = require('express');

const { protect, authorize } = require('../middleware/auth');
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
router.use(authorize('admin', 'teacher'));

router.post('/media', upload.single('file'), uploadCmsBookMedia);
router.post('/', createCmsBook);
router.get('/', listCmsBooks);
router.get('/:id', getCmsBookById);
router.put('/:id', updateCmsBook);
router.patch('/:id/publish', publishCmsBook);
router.patch('/:id/unpublish', unpublishCmsBook);
router.patch('/:id/archive', archiveCmsBook);
router.delete('/:id', deleteCmsBook);

module.exports = router;
