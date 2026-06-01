const mongoose = require('mongoose');

const pageTypes = [
  'cover',
  'demo',
  'activity_demo_video',
  'content',
  'activity_drag_2x2',
  'activity_drag_2x1',
  'reward',
  'end',
];

const interactionOptionSchema = new mongoose.Schema(
  {
    optionId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    imageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    audioMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
  },
  { _id: false }
);

const interactionDropZoneSchema = new mongoose.Schema(
  {
    zoneId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    correctOptionId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const interactionConfigSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['drag_2x2', 'drag_2x1'],
      default: null,
    },
    allowRetry: { type: Boolean, default: true },
    options: { type: [interactionOptionSchema], default: [] },
    dropZones: { type: [interactionDropZoneSchema], default: [] },
  },
  { _id: false }
);

const pageMediaSchema = new mongoose.Schema(
  {
    imageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    /** Narration on content pages; optional intro background music on cover (looped in player). */
    audioMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    videoMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    instructionAudioMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    backgroundImageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    guideImageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    guideImageMediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
  },
  { _id: false }
);

const pageNavigationSchema = new mongoose.Schema(
  {
    allowBack: { type: Boolean, default: true },
    allowNext: { type: Boolean, default: true },
    requireCompletionToNext: { type: Boolean, default: false },
  },
  { _id: false }
);

const pageScoringSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    points: { type: Number, default: 0, min: 0 },
    awardMode: {
      type: String,
      enum: ['once_on_correct'],
      default: 'once_on_correct',
    },
  },
  { _id: false }
);

const pageReadingWordSchema = new mongoose.Schema(
  {
    w: { type: String, required: true, trim: true },
    start: { type: Number, required: true, min: 0 },
    end: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pageReadingSchema = new mongoose.Schema(
  {
    text: { type: String, default: null, trim: true },
    durationSec: { type: Number, default: null, min: 0 },
    words: { type: [pageReadingWordSchema], default: [] },
  },
  { _id: false }
);

const bookPageSchema = new mongoose.Schema(
  {
    pageId: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    type: { type: String, required: true, enum: pageTypes },
    title: { type: String, default: null, trim: true, maxlength: 200 },
    subtitle: { type: String, default: null, trim: true, maxlength: 500 },
    media: { type: pageMediaSchema, default: () => ({}) },
    reading: { type: pageReadingSchema, default: null },
    interaction: { type: interactionConfigSchema, default: null },
    navigation: { type: pageNavigationSchema, default: () => ({}) },
    scoring: { type: pageScoringSchema, default: () => ({}) },
  },
  { _id: false }
);

const cmsBookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a book title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    pages: {
      type: [bookPageSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

function isInteractivePage(type) {
  return type === 'activity_drag_2x2' || type === 'activity_drag_2x1';
}

function validatePageByType(page) {
  const media = page.media || {};
  const reading = page.reading || null;
  const interaction = page.interaction || null;
  const options = Array.isArray(interaction?.options) ? interaction.options : [];

  const ensureInteractiveOptionsMedia = (pageType) => {
    const hasOptionAudio = options.every((option) => Boolean(option.audioMediaId));
    if (!hasOptionAudio) {
      throw new Error(`${pageType} page requires audioMediaId for every interaction option`);
    }

    const hasOptionImages = options.every((option) => Boolean(option.imageMediaId));
    if (!hasOptionImages) {
      throw new Error(`${pageType} page requires imageMediaId for every interaction option (option icon)`);
    }
  };

  const ensureInteractiveBackground = (pageType) => {
    if (!media.backgroundImageMediaId) {
      throw new Error(`${pageType} page requires media.backgroundImageMediaId (interactive background image)`);
    }
  };

  if (page.type === 'cover') {
    if (!media.imageMediaId) {
      throw new Error('Cover page requires media.imageMediaId');
    }
    // media.audioMediaId is optional intro background music for the cover/intro screen.
  }

  if (page.type === 'activity_demo_video' && !media.videoMediaId) {
    throw new Error('activity_demo_video page requires media.videoMediaId');
  }

  if (page.type === 'reward' && !media.videoMediaId) {
    throw new Error('Reward page requires media.videoMediaId');
  }

  if (page.type === 'content' && reading) {
    if (reading.durationSec != null && Number(reading.durationSec) <= 0) {
      throw new Error('content page reading.durationSec must be greater than 0');
    }

    if (Array.isArray(reading.words) && reading.words.length) {
      const duration = Number(reading.durationSec);
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('content page reading.words requires reading.durationSec');
      }

      let previousEnd = 0;
      reading.words.forEach((word, index) => {
        if (!word || !String(word.w || '').trim()) {
          throw new Error(`content page reading.words[${index}] requires non-empty w`);
        }
        if (!Number.isFinite(word.start) || !Number.isFinite(word.end)) {
          throw new Error(`content page reading.words[${index}] requires numeric start/end`);
        }
        if (word.start < 0 || word.end <= word.start || word.end > duration) {
          throw new Error(`content page reading.words[${index}] must satisfy 0 <= start < end <= durationSec`);
        }
        if (index > 0 && word.start < previousEnd) {
          throw new Error(`content page reading.words[${index}] must be ordered by start`);
        }
        previousEnd = word.end;
      });
    }
  }

  if (page.type === 'activity_drag_2x2') {
    if (!interaction || interaction.kind !== 'drag_2x2') {
      throw new Error('activity_drag_2x2 page requires interaction.kind=drag_2x2');
    }
    if (!Array.isArray(interaction.options) || interaction.options.length !== 2) {
      throw new Error('activity_drag_2x2 page requires exactly 2 interaction options');
    }
    if (!Array.isArray(interaction.dropZones) || interaction.dropZones.length !== 2) {
      throw new Error('activity_drag_2x2 page requires exactly 2 drop zones');
    }
    if (!Array.isArray(media.guideImageMediaIds) || media.guideImageMediaIds.length !== 2) {
      throw new Error('activity_drag_2x2 page requires exactly 2 guide images');
    }
    ensureInteractiveOptionsMedia('activity_drag_2x2');
    ensureInteractiveBackground('activity_drag_2x2');
  }

  if (page.type === 'activity_drag_2x1') {
    if (!interaction || interaction.kind !== 'drag_2x1') {
      throw new Error('activity_drag_2x1 page requires interaction.kind=drag_2x1');
    }
    if (!Array.isArray(interaction.options) || interaction.options.length !== 2) {
      throw new Error('activity_drag_2x1 page requires exactly 2 interaction options');
    }
    if (!Array.isArray(interaction.dropZones) || interaction.dropZones.length !== 1) {
      throw new Error('activity_drag_2x1 page requires exactly 1 drop zone');
    }
    if (!media.guideImageMediaId) {
      throw new Error('activity_drag_2x1 page requires 1 guide image');
    }
    ensureInteractiveOptionsMedia('activity_drag_2x1');
    ensureInteractiveBackground('activity_drag_2x1');
  }

  if (page.scoring && page.scoring.enabled && page.scoring.points < 0) {
    throw new Error(`Page at order=${page.order} has invalid scoring.points`);
  }
}

cmsBookSchema.pre('validate', function (next) {
  try {
    const pages = Array.isArray(this.pages) ? [...this.pages] : [];
    if (!pages.length) {
      next();
      return;
    }

    pages.sort((a, b) => a.order - b.order);

    // Rule: first page must be cover
    const firstPage = pages[0];
    if (!firstPage || firstPage.type !== 'cover' || firstPage.order !== 1) {
      throw new Error('First page must be cover with order=1');
    }

    const pageIds = new Set();
    for (let i = 0; i < pages.length; i += 1) {
      const page = pages[i];

      if (page.order !== i + 1) {
        throw new Error('Page order must be continuous starting from 1');
      }
      if (pageIds.has(page.pageId)) {
        throw new Error(`Duplicate pageId detected: ${page.pageId}`);
      }
      pageIds.add(page.pageId);

      validatePageByType(page);

      if (page.type === 'cover' && !String(page.title || '').trim()) {
        throw new Error('Cover page requires title');
      }

      if (isInteractivePage(page.type)) {
        const previousPage = pages[i - 1];
        const hasValidPreviousPage = previousPage
          && (previousPage.type === 'activity_demo_video' || previousPage.type === 'content');
        if (!hasValidPreviousPage) {
          throw new Error(
            `Interactive page at order=${page.order} must be preceded by content or activity_demo_video page`
          );
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

cmsBookSchema.index({ title: 1 });
cmsBookSchema.index({ status: 1 });
cmsBookSchema.index({ language: 1 });
cmsBookSchema.index({ createdBy: 1, status: 1 });
cmsBookSchema.index({ isArchived: 1 });

module.exports = mongoose.model('CmsBook', cmsBookSchema);
