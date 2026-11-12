import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack as BackIcon, VisibilityOutlined as PreviewIcon } from '@mui/icons-material';
import useExperienceEditor, { BANNER } from '../../../../hooks/experienceEditorHook';
import { showConfirmationDialog } from '../../../../store/slices/uiSlice';
import { countErrors, errorFieldIds, findPublishProblems, validateForm } from '../../../../utils/experienceForm';
import ExperienceDetailsSection from './ExperienceDetailsSection';
import ExperienceVideosSection from './ExperienceVideosSection';
import ExperienceStatusCard from './ExperienceStatusCard';
import { ExperienceCoverCard, ExperiencePrintableCard } from './ExperiencePicturesCards';
import ExperienceSaveBar from './ExperienceSaveBar';
import ExperienceSaveBanner from './ExperienceSaveBanner';
import VideoPreviewDialog from './VideoPreviewDialog';
import ExperiencePreview from './preview/ExperiencePreview';

export const LIST_PATH = '/admin/experiences';

const font = { fontFamily: 'Quicksand, sans-serif' };

const MISSING_WORDS = { title: 'a title', videos: 'at least one video' };

const focusField = (id) => {
  const element = id ? document.getElementById(id) : null;
  if (!element) return false;
  if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.focus({ preventScroll: true });
  return true;
};

/** The skeleton shown while an experience is being loaded for editing. */
const LoadingForm = () => (
  <Box role="status" aria-label="Loading the experience" sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(0, 1fr)' } }}>
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={260} />
      <Skeleton variant="rounded" height={320} />
    </Stack>
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={220} />
    </Stack>
  </Box>
);

/**
 * The Experience add / edit page (/admin/experiences/create and /admin/experiences/:uuid/edit): the details and the
 * videos on the left, the status, cover picture and printable on the right, and a Save bar that stays in view.
 *
 * The admin's work is never thrown away by a failure: whatever the server says, the form stays as it was typed.
 */
const ExperienceEditorMain = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatchStore = useDispatch();
  const { uuid } = useParams();
  const editor = useExperienceEditor(uuid);
  const { status, form, errors, dirty, saving, submitted, banner, focusKey, updatedAt, isEdit, loadError, dispatch, save, reload } = editor;
  const [preview, setPreview] = useState(null);
  // 'edit' is the form; 'preview' shows the whole experience as children see it, from what is typed right now.
  const [view, setView] = useState('edit');

  // ------------------------------------------------------------ changes (stable, so the video rows are not redrawn for nothing)
  const onField = useCallback((name, value) => dispatch({ type: 'set-field', name, value }), [dispatch]);
  const onPrintable = useCallback((name, value) => dispatch({ type: 'set-printable', name, value }), [dispatch]);
  const onAddVideo = useCallback(() => dispatch({ type: 'add-video' }), [dispatch]);
  const onVideoChange = useCallback((key, patch) => dispatch({ type: 'update-video', key, patch }), [dispatch]);
  const onRemoveVideo = useCallback((key) => dispatch({ type: 'remove-video', key }), [dispatch]);
  const onMoveVideo = useCallback((from, to) => dispatch({ type: 'move-video', from, to }), [dispatch]);
  const onPickCover = useCallback((file) => dispatch({ type: 'set-picture', which: 'cover', file }), [dispatch]);
  const onRemoveCover = useCallback(() => dispatch({ type: 'remove-picture', which: 'cover' }), [dispatch]);
  const onPickPrintable = useCallback((file) => dispatch({ type: 'set-picture', which: 'printableImage', file }), [dispatch]);
  const onRemovePrintable = useCallback(() => dispatch({ type: 'remove-picture', which: 'printableImage' }), [dispatch]);
  const onPreview = useCallback((video) => setPreview(video), []);
  const onClosePreview = useCallback(() => setPreview(null), []);
  const onPublished = useCallback((value) => dispatch({ type: 'set-field', name: 'isPublished', value }), [dispatch]);

  // ------------------------------------------------------------ leaving
  const goToList = useCallback(() => navigate(LIST_PATH), [navigate]);

  const handleCancel = useCallback(() => {
    if (!dirty) {
      goToList();
      return;
    }
    dispatchStore(
      showConfirmationDialog({
        title: 'Leave without saving?',
        message: 'You have unsaved changes. If you leave now, they will be lost.',
        type: 'warning',
        confirmText: 'Leave',
        cancelText: 'Keep editing',
        onConfirm: goToList,
      })
    );
  }, [dirty, dispatchStore, goToList]);

  // Closing the tab or reloading with unsaved work: the browser asks first.
  useEffect(() => {
    if (!dirty || saving) return undefined;
    const warn = (event) => {
      event.preventDefault();
      // eslint-disable-next-line no-param-reassign
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  // ------------------------------------------------------------ saving
  const finish = useCallback(
    (result) => {
      if (result.ok) {
        goToList();
      } else if (result.reason === 'invalid') {
        focusField(errorFieldIds(validateForm(form), form)[0]);
      }
    },
    [form, goToList]
  );

  const handleSave = useCallback(async () => finish(await save()), [finish, save]);
  const handleOverwrite = useCallback(async () => finish(await save({ overwrite: true })), [finish, save]);

  // After a failed save, take the admin to the first field the server marked, or to the message itself.
  const bannerRef = useRef(null);
  const latest = useRef({ errors, form });
  latest.current = { errors, form };
  useEffect(() => {
    if (!banner) return;
    if (banner.kind === BANNER.VALIDATION || banner.kind === BANNER.PUBLISH) {
      if (focusField(errorFieldIds(latest.current.errors, latest.current.form)[0])) return;
    }
    if (bannerRef.current && typeof bannerRef.current.scrollIntoView === 'function') {
      bannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [banner]);

  // ------------------------------------------------------------ what is shown
  const title = isEdit ? 'Edit experience' : 'Add experience';
  const problems = countErrors(errors);
  const missing = Object.keys(findPublishProblems(form)).map((key) => MISSING_WORDS[key]);

  const header = (
    <Paper sx={{ p: 2.5, mb: 2, borderRadius: '16px', border: `1px solid ${theme.palette.border.main}`, boxShadow: theme.shadows[2] }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Tooltip title="Back to experiences">
          <IconButton aria-label="Back to experiences" onClick={handleCancel} disabled={saving}>
            <BackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" component="h1" sx={{ ...font, fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.75rem' } }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ ...font, color: theme.palette.text.secondary }}>
            {isEdit
              ? 'Change anything below, then save. Children see the changes as soon as you do, if it is published.'
              : 'Fill in the details, add the videos, then create it. You can keep it as a draft until it is ready.'}
          </Typography>
        </Box>
        {status === 'ready' && (
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            disabled={saving}
            onClick={() => setView('preview')}
            sx={{ textTransform: 'none', borderRadius: '10px', ...font, fontWeight: 700, flexShrink: 0 }}
          >
            Preview
          </Button>
        )}
      </Stack>
    </Paper>
  );

  if (status === 'loading') {
    return (
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        {header}
        <LoadingForm />
      </Box>
    );
  }

  if (status === 'notFound' || status === 'loadError') {
    const missingOne = status === 'notFound';
    return (
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        {header}
        <Alert
          severity={missingOne ? 'warning' : 'error'}
          sx={font}
          action={
            <Stack direction="row" spacing={1}>
              {!missingOne && (
                <Button color="inherit" size="small" onClick={reload} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Retry
                </Button>
              )}
              <Button color="inherit" size="small" onClick={goToList} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Back to experiences
              </Button>
            </Stack>
          }
        >
          {missingOne ? 'This experience no longer exists. It may have been deleted.' : loadError || 'Could not load the experience.'}
        </Alert>
      </Box>
    );
  }

  if (view === 'preview') {
    return (
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <ExperiencePreview form={form} onBack={() => setView('edit')} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      {header}

      <div ref={bannerRef}>
        <ExperienceSaveBanner banner={banner} saving={saving} onDismiss={() => dispatch({ type: 'dismiss-banner' })} onLoadTheirs={reload} onOverwrite={handleOverwrite} onBackToList={goToList} />
      </div>
      {!banner && submitted && problems > 0 && (
        <Alert severity="error" role="alert" sx={{ mb: 2, ...font }}>
          {problems === 1 ? 'There is 1 thing to fix before this can be saved.' : `There are ${problems} things to fix before this can be saved.`} The fields are marked below.
        </Alert>
      )}

      <Box component="fieldset" disabled={saving} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gap: 2, alignItems: 'start', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(0, 1fr)' } }}>
          <Stack spacing={2}>
            <ExperienceDetailsSection
              title={form.title}
              description={form.description}
              titleError={errors.title || ''}
              descriptionError={errors.description || ''}
              onChange={onField}
            />
            <ExperienceVideosSection
              videos={form.videos}
              error={errors.videos || ''}
              rowErrors={errors.rows}
              focusKey={focusKey}
              onAdd={onAddVideo}
              onChange={onVideoChange}
              onRemove={onRemoveVideo}
              onMove={onMoveVideo}
              onPreview={onPreview}
            />
          </Stack>
          <Stack spacing={2}>
            <ExperienceStatusCard isPublished={form.isPublished} missing={missing} updatedAt={isEdit ? updatedAt : null} onChange={onPublished} />
            <ExperienceCoverCard picture={form.cover} error={errors.coverImage || ''} onPick={onPickCover} onRemove={onRemoveCover} />
            <ExperiencePrintableCard
              printable={form.printable}
              picture={form.printableImage}
              linkError={errors['printable.link'] || ''}
              buttonError={errors['printable.button'] || ''}
              pictureError={errors.printableImage || ''}
              onChange={onPrintable}
              onPick={onPickPrintable}
              onRemove={onRemovePrintable}
            />
          </Stack>
        </Box>
      </Box>

      <ExperienceSaveBar isEdit={isEdit} dirty={dirty} saving={saving} onCancel={handleCancel} onSave={handleSave} />
      <VideoPreviewDialog video={preview} onClose={onClosePreview} />
    </Box>
  );
};

export default ExperienceEditorMain;
