const KidsWallPost = require('../models/KidsWallPost');
const Media = require('../models/Media');
const { ChildProfile } = require('../models');
const path = require('path');
const fs = require('fs-extra');

/**
 * KidsWall Service
 * 
 * Business logic for KidsWall posts
 */

/**
 * Get all posts for a child
 * @param {String} childId - Child profile ID (optional, if not provided returns all posts)
 * @param {Object} filters - Optional filters (isApproved, isActive)
 * @returns {Promise<Array>} Array of posts
 */
const getChildPosts = async (childId, filters = {}) => {
  try {
    // Build query
    const query = {
      isActive: filters.isActive !== undefined ? filters.isActive : true,
    };

    // If childId is provided, filter by child
    if (childId) {
      // Verify child exists
      const child = await ChildProfile.findById(childId);
      if (!child) {
        throw new Error('Child not found');
      }
      query.child = childId;
    }

    // Add optional filters
    if (filters.isApproved !== undefined) {
      query.isApproved = filters.isApproved;
    }

    // Get posts with populated data
    const posts = await KidsWallPost.find(query)
      .populate({
        path: 'child',
        select: 'displayName avatar age',
      })
      .populate({
        path: 'images',
        select: 'url filePath mimeType size',
      })
      .populate({
        path: 'likes.child',
        select: 'displayName',
      })
      .populate({
        path: 'stars.child',
        select: 'displayName',
      })
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    return posts;
  } catch (error) {
    throw new Error(`Failed to get child posts: ${error.message}`);
  }
};

/**
 * Get single post by ID
 * @param {String} postId - Post ID
 * @param {String} childId - Child profile ID (for verification)
 * @returns {Promise<Object>} Post object
 */
const getPostById = async (postId, childId) => {
  try {
    const post = await KidsWallPost.findOne({
      _id: postId,
      child: childId,
      isActive: true,
    })
      .populate({
        path: 'child',
        select: 'displayName avatar age',
      })
      .populate({
        path: 'images',
        select: 'url filePath mimeType size',
      })
      .populate({
        path: 'likes.child',
        select: 'displayName',
      })
      .populate({
        path: 'stars.child',
        select: 'displayName',
      })
      .lean();

    if (!post) {
      throw new Error('Post not found or does not belong to this child');
    }

    return post;
  } catch (error) {
    throw new Error(`Failed to get post: ${error.message}`);
  }
};

/**
 * Create Media record from uploaded file
 * @param {Object} file - Multer file object
 * @param {String} uploadedBy - User ID who uploaded
 * @returns {Promise<Object>} Created Media record
 */
const createMediaFromFile = async (file, uploadedBy) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Build file URL
    const relativePath = path.relative(
      path.join(__dirname, '../uploads'),
      file.path
    ).replace(/\\/g, '/');
    const fileUrl = `/uploads/${relativePath}`;

    // Create Media record
    const media = await Media.create({
      type: 'image',
      title: file.originalname,
      filePath: relativePath,
      url: fileUrl,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: uploadedBy,
    });

    return media;
  } catch (error) {
    throw new Error(`Failed to create media record: ${error.message}`);
  }
};

/**
 * Validate post data
 * @param {Object} postData - Post data object
 * @returns {Object} Validation result { valid: boolean, errors: array }
 */
const validatePostData = (postData) => {
  const errors = [];

  // Title validation
  if (!postData.title || postData.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (postData.title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  // Content/Description validation
  if (!postData.content || postData.content.trim().length === 0) {
    errors.push('Description is required');
  } else if (postData.content.trim().length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Create post with image
 * @param {String} childId - Child profile ID
 * @param {Object} postData - Post data (title, content)
 * @param {Object} imageFile - Multer file object
 * @param {String} uploadedBy - User ID (parent who uploaded for child)
 * @returns {Promise<Object>} Created post
 */
const createPostWithImage = async (childId, postData, imageFile, uploadedBy) => {
  try {
    // Verify child exists
    const child = await ChildProfile.findById(childId);
    if (!child) {
      throw new Error('Child not found');
    }

    // Validate post data
    const validation = validatePostData(postData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Validate image file
    if (!imageFile) {
      throw new Error('Image is required');
    }

    // Create Media record for image
    const media = await createMediaFromFile(imageFile, uploadedBy);

    // Create post - instantly approved (no pending status)
    const post = await KidsWallPost.create({
      child: childId,
      type: 'image',
      title: postData.title.trim(),
      content: postData.content.trim(),
      images: [media._id],
      isApproved: true, // Instantly approved - no pending status
      isActive: true,
      approvedBy: uploadedBy, // Set the approver (parent/admin who created it)
      approvedAt: new Date(), // Set approval timestamp
    });

    // Populate and return
    const populatedPost = await KidsWallPost.findById(post._id)
      .populate({
        path: 'child',
        select: 'displayName avatar age',
      })
      .populate({
        path: 'images',
        select: 'url filePath mimeType size',
      })
      .populate({
        path: 'likes.child',
        select: 'displayName',
      })
      .populate({
        path: 'stars.child',
        select: 'displayName',
      })
      .lean();

    return populatedPost;
  } catch (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }
};

/**
 * Update post with optional new image
 * @param {String} postId - Post ID
 * @param {String} childId - Child profile ID (for verification)
 * @param {Object} postData - Updated post data
 * @param {Object} imageFile - Optional new image file
 * @param {String} uploadedBy - User ID
 * @returns {Promise<Object>} Updated post
 */
const updatePostWithImage = async (postId, childId, postData, imageFile, uploadedBy) => {
  try {
    // Verify post exists and belongs to child
    const existingPost = await KidsWallPost.findOne({
      _id: postId,
      child: childId,
      isActive: true,
    });

    if (!existingPost) {
      throw new Error('Post not found or does not belong to this child');
    }

    // Validate post data if provided
    if (postData.title || postData.content) {
      const validation = validatePostData({
        title: postData.title || existingPost.title,
        content: postData.content || existingPost.content,
      });
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
    }

    // Update fields
    const updateData = {};
    if (postData.title) {
      updateData.title = postData.title.trim();
    }
    if (postData.content) {
      updateData.content = postData.content.trim();
    }

    // Handle new image if provided
    if (imageFile) {
      // Create new Media record
      const newMedia = await createMediaFromFile(imageFile, uploadedBy);

      // Get old image to delete file later
      const oldImage = existingPost.images[0];
      
      // Update images array
      updateData.images = [newMedia._id];

      // Delete old image file and Media record
      if (oldImage) {
        try {
          const oldMedia = await Media.findById(oldImage);
          if (oldMedia && oldMedia.filePath) {
            const oldFilePath = path.join(__dirname, '../uploads', oldMedia.filePath);
            if (await fs.pathExists(oldFilePath)) {
              await fs.remove(oldFilePath);
            }
          }
          await Media.findByIdAndDelete(oldImage);
        } catch (err) {
          console.error('Error deleting old image:', err);
          // Don't throw - continue with update
        }
      }
    }

    // Update post
    const updatedPost = await KidsWallPost.findByIdAndUpdate(
      postId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'child',
        select: 'displayName avatar age',
      })
      .populate({
        path: 'images',
        select: 'url filePath mimeType size',
      })
      .lean();

    return updatedPost;
  } catch (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }
};

/**
 * Delete post (soft delete)
 * @param {String} postId - Post ID
 * @param {String} childId - Child profile ID (for verification)
 * @returns {Promise<Object>} Deletion result
 */
const deletePost = async (postId, childId) => {
  try {
    // Verify post exists and belongs to child
    const post = await KidsWallPost.findOne({
      _id: postId,
      child: childId,
      isActive: true,
    });

    if (!post) {
      throw new Error('Post not found or does not belong to this child');
    }

    // Soft delete
    await KidsWallPost.findByIdAndUpdate(postId, {
      isActive: false,
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }
};

/**
 * Toggle like on a post
 * @param {String} postId - Post ID
 * @param {String} childId - Child profile ID who is liking
 * @returns {Promise<Object>} Updated post
 */
const toggleLike = async (postId, childId) => {
  try {
    const post = await KidsWallPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if child already liked
    const existingLikeIndex = post.likes.findIndex(
      (like) => like.child.toString() === childId.toString()
    );

    if (existingLikeIndex !== -1) {
      // Unlike - remove from array
      post.likes.splice(existingLikeIndex, 1);
    } else {
      // Like - add to array
      post.likes.push({
        child: childId,
        likedAt: new Date(),
      });
    }

    await post.save();

    // Return populated post
    const updatedPost = await KidsWallPost.findById(postId)
      .populate({
        path: 'child',
        select: 'displayName avatar age',
      })
      .populate({
        path: 'images',
        select: 'url filePath mimeType size',
      })
      .populate({
        path: 'likes.child',
        select: 'displayName',
      })
      .populate({
        path: 'stars.child',
        select: 'displayName',
      })
      .lean();

    return updatedPost;
  } catch (error) {
    throw new Error(`Failed to toggle like: ${error.message}`);
  }
};

/**
 * Toggle star on a post
 * @param {String} postId - Post ID
 * @param {String} childId - Child profile ID who is starring
 * @returns {Promise<Object>} Updated post
 */
const toggleStar = async (postId, childId) => {
  try {
    const post = await KidsWallPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if child already starred
    const existingStarIndex = post.stars.findIndex(
      (star) => star.child.toString() === childId.toString()
    );

    if (existingStarIndex !== -1) {
      // Unstar - remove from array
      post.stars.splice(existingStarIndex, 1);
    } else {
      // Star - add to array
      post.stars.push({
        child: childId,
        starredAt: new Date(),
      });
    }

    await post.save();

    // Return populated post
    const updatedPost = await KidsWallPost.findById(postId)
      .populate({
        path: 'child',
        select: 'displayName avatar age',
      })
      .populate({
        path: 'images',
        select: 'url filePath mimeType size',
      })
      .populate({
        path: 'likes.child',
        select: 'displayName',
      })
      .populate({
        path: 'stars.child',
        select: 'displayName',
      })
      .lean();

    return updatedPost;
  } catch (error) {
    throw new Error(`Failed to toggle star: ${error.message}`);
  }
};

module.exports = {
  getChildPosts,
  getPostById,
  createPostWithImage,
  updatePostWithImage,
  deletePost,
  validatePostData,
  toggleLike,
  toggleStar,
};
