const express = require('express');
const router = express.Router();
const controller = require('../controllers/experienceChild.controller');
const { protect } = require('../middleware/auth');

/**
 * Experiences for children: the published ones under Explore (read only).
 *
 * Base path: /api/experiences   (plural; /api/experience, singular, is the free Smoothie page on the sales
 * site, and /api/admin/experiences is the admin side)
 *
 * GET /        - the published experiences, in the admin's order (cards: title, description, cover, video count)
 * GET /:uuid   - one published experience: videos in order and the printable (a link or an uploaded file)
 *
 * Any signed-in account can read them (the app signs in as the parent, like Explore); a draft is never shown.
 */
router.use(protect);

router.get('/', controller.list);
router.get('/:uuid', controller.getOne);

module.exports = router;
