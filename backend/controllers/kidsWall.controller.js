const kidsWallService = require('../services/kidsWall.service');
const { ChildProfile } = require('../models');

/**
 * @desc    Get all posts (feed) - shows all posts from all children, newest first
 * @route   GET /api/kids-wall
 * @access  Private (Parent/Admin)
 */
const getAllPosts = async (req, res) => {
  try {
    const filters = {
      ...req.query,
      // Default to showing only approved posts in feed
      isApproved: req.query.isApproved !== undefined ? req.query.isApproved === 'true' : true,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true,
    };

    // Get all posts (feed view) - no childId filter, shows posts from all children
    const posts = await kidsWallService.getChildPosts(null, filters);

    res.status(200).json({
      success: true,
      message: 'Posts retrieved successfully',
      data: posts,
      count: posts.length,
    });
  } catch (error) {
    console.error('Error in getAllPosts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve posts',
    });
  }
};

/**
 * @desc    Get all posts for a specific child
 * @route   GET /api/kids-wall/child/:childId
 * @access  Private (Parent/Admin)
 */
const getChildPosts = async (req, res) => {
  try {
    const { childId } = req.params;
    const filters = req.query;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const posts = await kidsWallService.getChildPosts(childId, filters);

    res.status(200).json({
      success: true,
      message: 'Posts retrieved successfully',
      data: posts,
      count: posts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve posts',
    });
  }
};

/**
 * @desc    Get single post by ID
 * @route   GET /api/kids-wall/:postId/child/:childId
 * @access  Private (Parent/Admin)
 */
const getPostById = async (req, res) => {
  try {
    const { postId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const post = await kidsWallService.getPostById(postId, childId);

    res.status(200).json({
      success: true,
      message: 'Post retrieved successfully',
      data: post,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve post',
    });
  }
};

/**
 * @desc    Create new post with image (instantly approved, no pending status)
 * @route   POST /api/kids-wall/child/:childId
 * @access  Private (Parent/Admin)
 * 
 * Request body (multipart/form-data):
 * - title: String (required, max 200 chars)
 * - content: String (required, max 1000 chars) - used as description
 * - image: File (required, image file)
 * 
 * Note: Posts are instantly approved upon creation (isApproved: true)
 */
const createPost = async (req, res) => {
  try {
    const { childId } = req.params;
    const { title, content } = req.body;
    const imageFile = req.file;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Image is required',
      });
    }

    // Create post
    const post = await kidsWallService.createPostWithImage(
      childId,
      { title, content },
      imageFile,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post,
    });
  } catch (error) {
    // Clean up uploaded file if post creation failed
    if (req.file && req.file.path) {
      try {
        const fs = require('fs-extra');
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }

    const statusCode = error.message.includes('required') || 
                      error.message.includes('exceed') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create post',
    });
  }
};

/**
 * @desc    Update existing post
 * @route   PATCH /api/kids-wall/:postId/child/:childId
 * @access  Private (Parent/Admin)
 * 
 * Request body (multipart/form-data, all fields optional):
 * - title: String (max 200 chars)
 * - content: String (max 1000 chars)
 * - image: File (optional, new image file)
 */
const updatePost = async (req, res) => {
  try {
    const { postId, childId } = req.params;
    const { title, content } = req.body;
    const imageFile = req.file;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    // At least one field must be provided
    if (!title && !content && !imageFile) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (title, content, or image) must be provided',
      });
    }

    // Update post
    const post = await kidsWallService.updatePostWithImage(
      postId,
      childId,
      { title, content },
      imageFile,
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: post,
    });
  } catch (error) {
    // Clean up uploaded file if update failed
    if (req.file && req.file.path) {
      try {
        const fs = require('fs-extra');
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }

    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('required') || 
                      error.message.includes('exceed') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update post',
    });
  }
};

/**
 * @desc    Delete post (soft delete)
 * @route   DELETE /api/kids-wall/:postId/child/:childId
 * @access  Private (Parent/Admin)
 */
const deletePost = async (req, res) => {
  try {
    const { postId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    await kidsWallService.deletePost(postId, childId);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete post',
    });
  }
};

/**
 * @desc    Toggle like on a post
 * @route   POST /api/kids-wall/:postId/like/child/:childId
 * @access  Private (Parent/Admin)
 */
const toggleLike = async (req, res) => {
  try {
    const { postId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const post = await kidsWallService.toggleLike(postId, childId);

    res.status(200).json({
      success: true,
      message: 'Like toggled successfully',
      data: post,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to toggle like',
    });
  }
};

/**
 * @desc    Toggle star on a post
 * @route   POST /api/kids-wall/:postId/star/child/:childId
 * @access  Private (Parent/Admin)
 */
const toggleStar = async (req, res) => {
  try {
    const { postId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const post = await kidsWallService.toggleStar(postId, childId);

    res.status(200).json({
      success: true,
      message: 'Star toggled successfully',
      data: post,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to toggle star',
    });
  }
};

module.exports = {
  getAllPosts,
  getChildPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleStar,
};
