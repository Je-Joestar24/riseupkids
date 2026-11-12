import { arrayMove } from '@dnd-kit/sortable';
import { LIMITS, NO_ERRORS, checkImageFile, emptyForm, emptyVideo, formFromExperience } from './experienceForm';

/**
 * The state of the Experience add / edit page, and every way it can change. Kept apart from the screen so
 * each change can be tested on its own.
 *
 *   status        'loading' | 'ready' | 'notFound' | 'loadError'
 *   initial       the form as it was loaded (or empty): what "unsaved changes" is measured against
 *   form          what the admin sees now
 *   submitted     the admin has tried to save: from then on the form's problems are shown and kept up to date
 *   fieldErrors   problems that were not found by looking at the form: the server's, and a rejected picture
 *   banner        the one message about the last save: { kind, message, reasons }
 *   updatedAt     what the server said the experience was last changed (sent back to detect someone else's edit)
 *   focusKey      the video row that was just added, so its title can take the cursor
 */

/** @returns {object} the state a page starts in: edit mode waits for the experience, create mode is ready */
export const initialEditorState = ({ isEdit }) => {
  const form = emptyForm();
  return {
    status: isEdit ? 'loading' : 'ready',
    loadError: null,
    initial: form,
    form,
    submitted: false,
    fieldErrors: NO_ERRORS,
    banner: null,
    saving: false,
    saved: false,
    updatedAt: null,
    uuid: null,
    focusKey: null,
  };
};

const withoutKeys = (errors, keys) => {
  if (!keys.some((key) => key in errors)) return errors;
  const next = { ...errors };
  keys.forEach((key) => delete next[key]);
  return next;
};

const withoutRowFields = (errors, rowKey, fields) => {
  const row = errors.rows[rowKey];
  if (!row || !fields.some((field) => field in row)) return errors;
  const nextRow = { ...row };
  fields.forEach((field) => delete nextRow[field]);
  const rows = { ...errors.rows };
  if (Object.keys(nextRow).length) rows[rowKey] = nextRow;
  else delete rows[rowKey];
  return { ...errors, rows };
};

const setForm = (state, form, fieldErrors = state.fieldErrors) => ({ ...state, form, fieldErrors, saved: false });

const PICTURES = ['cover', 'printableImage'];
const PICTURE_ERROR = { cover: 'coverImage', printableImage: 'printableImage' };

export function experienceEditorReducer(state, action) {
  switch (action.type) {
    case 'load-start':
      return { ...state, status: 'loading', loadError: null };

    case 'loaded': {
      const form = formFromExperience(action.experience);
      return {
        ...initialEditorState({ isEdit: true }),
        status: 'ready',
        initial: form,
        form,
        updatedAt: action.experience.updatedAt || null,
        uuid: action.experience.uuid || null,
      };
    }

    case 'load-not-found':
      return { ...state, status: 'notFound', loadError: null };

    case 'load-failed':
      return { ...state, status: 'loadError', loadError: action.message };

    case 'set-field': {
      const { name, value } = action;
      // Turning publishing off removes the "needs a title / video" reasons that came with it.
      const cleared = name === 'isPublished' ? ['title', 'videos'] : [name];
      return setForm(state, { ...state.form, [name]: value }, withoutKeys(state.fieldErrors, cleared));
    }

    case 'set-printable':
      return setForm(
        state,
        { ...state.form, printable: { ...state.form.printable, [action.name]: action.value } },
        withoutKeys(state.fieldErrors, [`printable.${action.name}`])
      );

    case 'add-video': {
      if (state.form.videos.length >= LIMITS.MAX_VIDEOS) return state;
      const video = emptyVideo();
      return {
        ...setForm(state, { ...state.form, videos: [...state.form.videos, video] }, withoutKeys(state.fieldErrors, ['videos'])),
        focusKey: video.key,
      };
    }

    case 'update-video': {
      const patch = action.patch;
      const videos = state.form.videos.map((video) => (video.key === action.key ? { ...video, ...patch } : video));
      return setForm(state, { ...state.form, videos }, withoutRowFields(state.fieldErrors, action.key, Object.keys(patch)));
    }

    case 'remove-video': {
      const videos = state.form.videos.filter((video) => video.key !== action.key);
      const rows = { ...state.fieldErrors.rows };
      delete rows[action.key];
      return setForm(state, { ...state.form, videos }, { ...withoutKeys(state.fieldErrors, ['videos']), rows });
    }

    case 'move-video': {
      const { from, to } = action;
      const count = state.form.videos.length;
      if (from === to || from < 0 || to < 0 || from >= count || to >= count) return state;
      return setForm(state, { ...state.form, videos: arrayMove(state.form.videos, from, to) });
    }

    case 'set-picture': {
      if (!PICTURES.includes(action.which)) return state;
      const reason = checkImageFile(action.file);
      if (reason) {
        return { ...state, fieldErrors: { ...state.fieldErrors, [PICTURE_ERROR[action.which]]: reason } };
      }
      const picture = { ...state.form[action.which], file: action.file, remove: false };
      return setForm(state, { ...state.form, [action.which]: picture }, withoutKeys(state.fieldErrors, [PICTURE_ERROR[action.which]]));
    }

    case 'remove-picture': {
      if (!PICTURES.includes(action.which)) return state;
      const current = state.form[action.which];
      const picture = { ...current, file: null, remove: Boolean(current.url) };
      return setForm(state, { ...state.form, [action.which]: picture }, withoutKeys(state.fieldErrors, [PICTURE_ERROR[action.which]]));
    }

    case 'submit':
      return { ...state, submitted: true, banner: null };

    case 'save-start':
      return { ...state, saving: true, banner: null };

    case 'save-failed':
      return {
        ...state,
        saving: false,
        banner: action.banner,
        fieldErrors: action.fieldErrors || state.fieldErrors,
      };

    case 'saved':
      return { ...state, saving: false, saved: true, banner: null, fieldErrors: NO_ERRORS };

    case 'dismiss-banner':
      return { ...state, banner: null };

    default:
      return state;
  }
}
