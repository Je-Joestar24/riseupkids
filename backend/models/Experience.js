const crypto = require('crypto');
const mongoose = require('mongoose');
const { LIMITS, DEFAULT_PRINTABLE_BUTTON } = require('../utils/experienceValidation.util');

/**
 * Experience Model
 *
 * One experience shown to children under Explore: a title, a description, a cover picture and an ordered
 * list of Bunny videos (plus an optional printable). Managed by admins; children only ever see the ones
 * that are published. The public id is `uuid` (random, never edited), so the internal database id is
 * never put in an address.
 *
 * Not to be confused with the free "Smoothie Experience" on the sales site (/api/experience, Flodesk
 * email check), which has no model and reads its two links from the environment.
 */
const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [LIMITS.VIDEO_TITLE_MAX, `Video title cannot exceed ${LIMITS.VIDEO_TITLE_MAX} characters`],
  },
  // Bunny iframe embed link (https://iframe.mediadelivery.net/embed/LIBRARY/VIDEO), checked before saving.
  embedUrl: {
    type: String,
    required: [true, 'Video link is required'],
    trim: true,
    maxlength: [LIMITS.URL_MAX, 'Video link is too long'],
  },
  // Place in the list: 1 = first. Always kept in step with the order of the array (see the hook below),
  // so positions are 1, 2, 3 ... with no gaps and no repeats.
  position: {
    type: Number,
    min: [1, 'Position starts at 1'],
  },
});

const experienceSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: () => crypto.randomUUID(),
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [LIMITS.TITLE_MAX, `Title cannot exceed ${LIMITS.TITLE_MAX} characters`],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [LIMITS.DESCRIPTION_MAX, `Description cannot exceed ${LIMITS.DESCRIPTION_MAX} characters`],
    },
    // Picture shown on the list card (an uploaded file, stored like the other covers).
    coverImage: {
      type: String,
      default: null,
    },
    // The order of the array is the order the child sees.
    videos: {
      type: [videoSchema],
      default: [],
      validate: {
        validator: (list) => list.length <= LIMITS.MAX_VIDEOS,
        message: `An experience can have at most ${LIMITS.MAX_VIDEOS} videos`,
      },
    },
    // Optional printable: a picture and a file on our own domain.
    printable: {
      image: { type: String, default: null },
      link: { type: String, default: '', maxlength: LIMITS.URL_MAX },
      button: {
        type: String,
        default: DEFAULT_PRINTABLE_BUTTON,
        trim: true,
        maxlength: LIMITS.PRINTABLE_BUTTON_MAX,
      },
    },
    // Position in the list children see (1 = first).
    order: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// The order of the array is the truth; every save numbers the videos from it, so a video added, removed or
// moved by any code path always ends up with the right position.
experienceSchema.pre('validate', function numberTheVideos(next) {
  this.videos.forEach((video, index) => {
    video.position = index + 1;
  });
  next();
});

experienceSchema.index({ isPublished: 1, order: 1 });
experienceSchema.index({ order: 1 });

module.exports = mongoose.model('Experience', experienceSchema);
