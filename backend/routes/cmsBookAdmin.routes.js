const express = require('express');

const { protect, authorize } = require('../middleware/auth');
const {
  createCmsBook,
  listCmsBooks,
  getCmsBookById,
  updateCmsBook,
  publishCmsBook,
  unpublishCmsBook,
  archiveCmsBook,
} = require('../controllers/cmsBookAdmin.controller');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.post('/', createCmsBook);
router.get('/', listCmsBooks);
router.get('/:id', getCmsBookById);
router.put('/:id', updateCmsBook);
router.patch('/:id/publish', publishCmsBook);
router.patch('/:id/unpublish', unpublishCmsBook);
router.patch('/:id/archive', archiveCmsBook);

module.exports = router;
