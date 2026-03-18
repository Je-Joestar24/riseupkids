const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const {
  getProgramMaterialsForChild,
} = require('../controllers/programMaterials.controller');

/**
 * Program Materials Routes (Parent)
 *
 * Base path: /api/parent/program-materials
 *
 * Routes:
 * - GET /children/:childId
 */

router.get(
  '/children/:childId',
  protect,
  authorize('parent', 'admin'),
  getProgramMaterialsForChild
);

module.exports = router;

