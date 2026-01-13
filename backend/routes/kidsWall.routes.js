const express = require('express');
const router = express.Router();
const {
  getAllPosts,
  getChildPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleStar,
} = require('../controllers/kidsWall.controller');
const { protect } = require('../middleware/auth');
const { uploadKidsWallImage } = require('../middleware/upload');

// All routes require authentication
router.use(protect);

/**
 * KidsWall Routes
 * 
 * All routes require authentication (parent or admin)
 * Child ID is passed as route parameter
 * 
 * Routes:
 * - GET    /                            - Get all posts (feed - all children)
 * - GET    /child/:childId              - Get all posts for a specific child
 * - GET    /:postId/child/:childId      - Get single post by ID
 * - POST   /child/:childId              - Create new post (with image upload)
 * - PATCH  /:postId/child/:childId     - Update post
 * - DELETE /:postId/child/:childId      - Delete post
 */

/**
 * @route   GET /api/kids-wall
 * @desc    Get all posts (feed - shows all posts from all children)
 * @access  Private (Parent/Admin)
 */
router.get('/all', getAllPosts);

/**
 * @route   GET /api/kids-wall/child/:childId
 * @desc    Get all posts for a specific child
 * @access  Private (Parent/Admin)
 */
router.get('/child/:childId', getChildPosts);

/**
 * @route   GET /api/kids-wall/:postId/child/:childId
 * @desc    Get single post by ID
 * @access  Private (Parent/Admin)
 */
router.get('/:postId/child/:childId', getPostById);

/**
 * @route   POST /api/kids-wall/child/:childId
 * @desc    Create new post with image
 * @access  Private (Parent/Admin)
 */
router.post('/child/:childId', uploadKidsWallImage.single('image'), createPost);

/**
 * @route   PATCH /api/kids-wall/:postId/child/:childId
 * @desc    Update existing post
 * @access  Private (Parent/Admin)
 */
router.patch('/:postId/child/:childId', uploadKidsWallImage.single('image'), updatePost);

/**
 * @route   DELETE /api/kids-wall/:postId/child/:childId
 * @desc    Delete post (soft delete)
 * @access  Private (Parent/Admin)
 */
router.delete('/:postId/child/:childId', deletePost);

/**
 * @route   POST /api/kids-wall/:postId/like/child/:childId
 * @desc    Toggle like on a post
 * @access  Private (Parent/Admin)
 */
router.post('/:postId/like/child/:childId', toggleLike);

/**
 * @route   POST /api/kids-wall/:postId/star/child/:childId
 * @desc    Toggle star on a post
 * @access  Private (Parent/Admin)
 */
router.post('/:postId/star/child/:childId', toggleStar);

module.exports = router;
