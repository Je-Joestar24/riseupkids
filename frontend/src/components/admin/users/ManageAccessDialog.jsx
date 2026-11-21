import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';
import useParents from '../../../hooks/parentsHook';
import { commonAreas, diffAreas, joinLabels, sameAreaList } from '../../../utils/accessAreaOptions';
import ContentCreatorAccessChecklist from './ContentCreatorAccessChecklist';

const listOf = (creator) => (Array.isArray(creator?.accessAreas) ? creator.accessAreas : []);

/**
 * Manage access (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md): change what one content creator can use, or give several
 * the same list at once. Opens with the ticks she has today, marks what will be added and removed, asks first when
 * anything is taken away, and shows a refusal inside the dialog without closing it.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<{ _id: string, name: string, accessAreas?: string[] }>} props.creators one for a single person, several for bulk
 * @param {(result: object) => void} [props.onSaved] called after a successful save, before the dialog closes
 */
const ManageAccessDialog = ({ open, onClose, creators = [], onSaved }) => {
  const theme = useTheme();
  const { accessAreaOptions, loadAccessAreas, setCreatorAccessData, setCreatorAccessBulkData, accessSaving } = useParents();

  const areas = accessAreaOptions.areas;
  const bulk = creators.length > 1;
  const single = creators.length === 1 ? creators[0] : null;

  const [selected, setSelected] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // The checkboxes are fetched once and kept
  useEffect(() => {
    if (open) loadAccessAreas().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Start from what she has today (for several people: what they ALL have)
  const creatorsKey = creators.map((creator) => `${creator._id}:${listOf(creator).join(',')}`).join('|');
  useEffect(() => {
    if (open) {
      setSelected(commonAreas(creators, areas));
      setConfirming(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, creatorsKey, areas]);

  const counts = useMemo(() => {
    const added = {};
    const removed = {};
    areas.forEach(({ key }) => {
      const ticked = selected.includes(key);
      const have = creators.filter((creator) => listOf(creator).includes(key)).length;
      added[key] = ticked ? creators.length - have : 0;
      removed[key] = ticked ? 0 : have;
    });
    return { added, removed };
  }, [areas, creators, selected]);

  // Everything each person would lose (the union), and whether anyone would change at all
  const lost = areas.map(({ key }) => key).filter((key) => counts.removed[key] > 0);
  const anyChange = creators.some((creator) => !sameAreaList(selected, listOf(creator)));
  const nothingTicked = selected.length === 0;
  const canSave = !accessSaving && anyChange && !nothingTicked && areas.length > 0;

  const peopleWhoLose = creators.filter((creator) => diffAreas(listOf(creator), selected, areas).removed.length > 0).length;
  const who = bulk ? `${peopleWhoLose} ${peopleWhoLose === 1 ? 'person' : 'people'}` : single?.name || 'This person';
  const theirContent = bulk ? 'Content they created' : `Content ${single?.name || 'this person'} created`;

  const save = async () => {
    setError(null);
    try {
      const result = bulk
        ? await setCreatorAccessBulkData(
            creators.map((creator) => creator._id),
            selected
          )
        : await setCreatorAccessData(single._id, selected);
      if (onSaved) onSaved(result);
      onClose();
    } catch (err) {
      // A refusal is shown here and the dialog stays open, with what was ticked
      setConfirming(false);
      setError(err?.message || 'Failed to update access');
    }
  };

  const handleSave = () => {
    if (lost.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    save();
  };

  const title = bulk ? `Manage access: ${creators.length} people` : `Manage access: ${single?.name || ''}`;

  return (
    <Dialog open={open} onClose={accessSaving ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="manage-access-title">
      <DialogTitle
        id="manage-access-title"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.border?.main}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {title}
        <Button onClick={onClose} disabled={accessSaving} sx={{ minWidth: 'auto', p: 0.5 }} aria-label="Close">
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {confirming ? (
          <Alert severity="warning" role="alertdialog" aria-label="Confirm removing access">
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {who} will lose access to {joinLabels(lost, areas)} straight away.
            </Typography>
            <Typography variant="body2">
              {theirContent} stays in the system. They stay signed in, and the access can be given back at any time.
            </Typography>
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
              {bulk
                ? 'Everyone chosen will get exactly these areas.'
                : 'Tick what this person can use. What is not ticked will not appear in their menu.'}
            </Typography>

            <ContentCreatorAccessChecklist
              areas={areas}
              value={selected}
              onChange={setSelected}
              original={bulk ? undefined : listOf(single)}
              addedCounts={bulk ? counts.added : undefined}
              removedCounts={bulk ? counts.removed : undefined}
              disabled={accessSaving}
              loading={accessAreaOptions.loading}
              loadError={accessAreaOptions.error}
              onRetry={() => loadAccessAreas().catch(() => {})}
            />

            {nothingTicked && areas.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="body2" color="error">
                  Choose at least one. To stop someone using the site entirely, use Archive instead.
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {confirming ? (
          <>
            <Button onClick={() => setConfirming(false)} disabled={accessSaving}>
              Back
            </Button>
            <Button variant="contained" color="error" onClick={save} disabled={accessSaving}>
              {accessSaving ? 'Saving...' : 'Yes, remove access'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={accessSaving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={!canSave}>
              {accessSaving ? 'Saving...' : 'Save access'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ManageAccessDialog;
