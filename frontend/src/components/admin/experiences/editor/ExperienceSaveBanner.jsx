import React from 'react';
import { Alert, AlertTitle, Button, Stack } from '@mui/material';
import { BANNER } from '../../../../hooks/experienceEditorHook';

const font = { fontFamily: 'Quicksand, sans-serif' };
const button = { textTransform: 'none', fontWeight: 700, ...font };

/**
 * What happened to the last save, when it did not work: one message, with the choices that make sense for it.
 *
 *   validation   the server found fields to fix (they are marked on the form)
 *   publish      it cannot be published yet (the reasons are marked on the form)
 *   conflict     someone else saved first: load their version, or save this one anyway
 *   notFound     the experience was deleted meanwhile
 *   error        anything else (the server, the network): the form is kept as it was
 */
const ExperienceSaveBanner = ({ banner, saving = false, onDismiss, onLoadTheirs, onOverwrite, onBackToList }) => {
  if (!banner) return null;
  const { kind, message, reasons = [] } = banner;

  const list = reasons.length > 0 && (
    <Stack component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
      {reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </Stack>
  );

  if (kind === BANNER.CONFLICT) {
    return (
      <Alert
        severity="warning"
        sx={{ mb: 2, ...font }}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button color="inherit" size="small" disabled={saving} onClick={onLoadTheirs} sx={button}>
              Load their version
            </Button>
            <Button color="inherit" size="small" disabled={saving} onClick={onOverwrite} sx={button}>
              Save mine anyway
            </Button>
          </Stack>
        }
      >
        <AlertTitle sx={{ ...font, fontWeight: 700 }}>Someone else saved this experience first</AlertTitle>
        {message} Loading their version replaces what you typed; saving yours replaces their changes.
      </Alert>
    );
  }

  if (kind === BANNER.NOT_FOUND) {
    return (
      <Alert
        severity="error"
        sx={{ mb: 2, ...font }}
        action={
          <Button color="inherit" size="small" onClick={onBackToList} sx={button}>
            Back to experiences
          </Button>
        }
      >
        <AlertTitle sx={{ ...font, fontWeight: 700 }}>Experience not found</AlertTitle>
        {message}
      </Alert>
    );
  }

  const severity = kind === BANNER.ERROR ? 'error' : kind === BANNER.PUBLISH ? 'warning' : 'error';
  return (
    <Alert
      severity={severity}
      sx={{ mb: 2, ...font }}
      onClose={onDismiss}
      closeText="Dismiss message"
    >
      <AlertTitle sx={{ ...font, fontWeight: 700 }}>{kind === BANNER.ERROR ? 'The experience was not saved' : message}</AlertTitle>
      {kind === BANNER.ERROR ? message : kind === BANNER.PUBLISH ? 'Add what is missing, or turn Published off to save it as a draft.' : 'Check the fields marked in red.'}
      {list}
    </Alert>
  );
};

export default ExperienceSaveBanner;
