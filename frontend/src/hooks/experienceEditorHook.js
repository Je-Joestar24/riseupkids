import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { showNotification } from '../store/slices/uiSlice';
import { EXPERIENCE_ERROR_CODES } from '../services/experienceAdminService';
import experienceEditorService from '../services/experienceEditorService';
import { experienceEditorReducer, initialEditorState } from '../utils/experienceEditorReducer';
import {
  NO_ERRORS,
  buildFormData,
  hasErrors,
  isFormDirty,
  mergeErrors,
  placeServerErrors,
  validateForm,
} from '../utils/experienceForm';

const BANNER = Object.freeze({
  VALIDATION: 'validation',
  PUBLISH: 'publish',
  CONFLICT: 'conflict',
  NOT_FOUND: 'notFound',
  ERROR: 'error',
});

/**
 * The Experience add / edit page: loads the experience (edit), holds the form, checks it, saves it, and turns
 * every kind of answer into something the screen can show without losing what the admin typed.
 *
 * @param {string|undefined} uuid the experience to edit; nothing to add a new one
 */
const useExperienceEditor = (uuid) => {
  const isEdit = Boolean(uuid);
  const dispatchStore = useDispatch();
  const [state, dispatch] = useReducer(experienceEditorReducer, { isEdit }, initialEditorState);

  // Saving finishes later: it must use the form as it is now, and must never run twice at once.
  const latest = useRef(state);
  latest.current = state;
  const saving = useRef(false);

  const notify = useCallback((message, type) => dispatchStore(showNotification({ message, type })), [dispatchStore]);

  // ------------------------------------------------------------ loading (edit)
  const load = useCallback(
    async (isCurrent = () => true) => {
      dispatch({ type: 'load-start' });
      try {
        const experience = await experienceEditorService.getExperience(uuid);
        if (isCurrent()) dispatch({ type: 'loaded', experience });
      } catch (error) {
        if (!isCurrent()) return;
        if (error.code === EXPERIENCE_ERROR_CODES.NOT_FOUND) dispatch({ type: 'load-not-found' });
        else dispatch({ type: 'load-failed', message: error.message });
      }
    },
    [uuid]
  );

  useEffect(() => {
    if (!isEdit) return undefined;
    let current = true;
    load(() => current);
    return () => {
      current = false;
    };
  }, [isEdit, load]);

  // ------------------------------------------------------------ what the screen shows
  // Once the admin has tried to save, the form's problems are shown and follow every change.
  const formErrors = useMemo(() => (state.submitted ? validateForm(state.form) : NO_ERRORS), [state.submitted, state.form]);
  const errors = useMemo(() => mergeErrors(formErrors, state.fieldErrors), [formErrors, state.fieldErrors]);
  const dirty = !state.saved && isFormDirty(state.form, state.initial);

  // ------------------------------------------------------------ saving
  /**
   * @param {{ overwrite?: boolean }} [options] `overwrite`: save even though someone else changed it (last save wins)
   * @returns {Promise<{ ok: boolean, reason?: 'invalid'|'busy'|'failed', experience?: object }>}
   */
  const save = useCallback(
    async ({ overwrite = false } = {}) => {
      if (saving.current) return { ok: false, reason: 'busy' };
      const { form, updatedAt } = latest.current;

      dispatch({ type: 'submit' });
      if (hasErrors(validateForm(form))) return { ok: false, reason: 'invalid' };

      saving.current = true;
      dispatch({ type: 'save-start' });
      try {
        const body = buildFormData(form, { expectedUpdatedAt: isEdit && !overwrite ? updatedAt : null });
        const { experience } = isEdit
          ? await experienceEditorService.updateExperience(uuid, body)
          : await experienceEditorService.createExperience(body);
        dispatch({ type: 'saved' });
        const name = `"${experience?.title || form.title.trim()}"`;
        notify(isEdit ? `${name} was saved.` : `${name} was created.`, 'success');
        return { ok: true, experience };
      } catch (error) {
        const failure = describeFailure(error, form);
        dispatch({ type: 'save-failed', banner: failure.banner, fieldErrors: failure.fieldErrors });
        return { ok: false, reason: 'failed', code: error.code || null };
      } finally {
        saving.current = false;
      }
    },
    [isEdit, uuid, notify]
  );

  // A button must not hand its click event to `load` as if it were the "still current?" check.
  const reload = useCallback(() => load(), [load]);

  return { ...state, isEdit, errors, dirty, dispatch, save, reload };
};

/** What the screen shows for a failed save: one banner, and the problems that go next to their fields. */
function describeFailure(error, form) {
  const { errors: fieldErrors, other } = placeServerErrors(error.errors, form);
  const reasons = other;
  switch (error.code) {
    case EXPERIENCE_ERROR_CODES.VALIDATION_FAILED:
      return { banner: { kind: BANNER.VALIDATION, message: error.message, reasons }, fieldErrors };
    case EXPERIENCE_ERROR_CODES.PUBLISH_BLOCKED:
      return { banner: { kind: BANNER.PUBLISH, message: error.message, reasons }, fieldErrors };
    case EXPERIENCE_ERROR_CODES.CONFLICT:
      return { banner: { kind: BANNER.CONFLICT, message: error.message, reasons: [] }, fieldErrors: null };
    case EXPERIENCE_ERROR_CODES.NOT_FOUND:
      return {
        banner: { kind: BANNER.NOT_FOUND, message: 'This experience no longer exists. It may have been deleted by someone else.', reasons: [] },
        fieldErrors: null,
      };
    default:
      return { banner: { kind: BANNER.ERROR, message: error.message || 'Could not save the experience.', reasons: [] }, fieldErrors: null };
  }
}

export { BANNER };
export default useExperienceEditor;
