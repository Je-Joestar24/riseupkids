import React from 'react';
import { Alert, Box, Button, Grid, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { SearchOff as NoMatchIcon, TravelExploreOutlined as EmptyIcon } from '@mui/icons-material';
import ExperienceCard from './ExperienceCard';

const SKELETON_COUNT = 6;

const GRID_ITEM = { xs: 12, sm: 6, md: 4, lg: 3 };

const LoadingGrid = () => (
  <Grid container spacing={2} role="status" aria-label="Loading experiences">
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <Grid key={index} item {...GRID_ITEM}>
        <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
          <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
          <Box sx={{ p: 2 }}>
            <Skeleton width="70%" height={28} />
            <Skeleton width="100%" />
            <Skeleton width="85%" />
          </Box>
        </Paper>
      </Grid>
    ))}
  </Grid>
);

const Message = ({ icon, title, children, action }) => (
  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
    <Stack alignItems="center" spacing={1}>
      {icon}
      <Typography variant="h6" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary', maxWidth: 480 }}>
        {children}
      </Typography>
      {action}
    </Stack>
  </Paper>
);

/**
 * The experiences on this page, and every state the list can be in:
 *   first load            skeleton cards
 *   load failed           the reason and a Retry button
 *   nothing created yet   an explanation
 *   nothing matches       "no match" with a Clear filters button
 *   refreshing            the rows stay, a thin progress bar shows above them
 *   refresh failed        the rows stay, with a warning and Retry
 */
const ExperiencesList = ({
  items = [],
  loaded = false,
  loading = false,
  error = null,
  hasFilters = false,
  totalExperiences = 0,
  busy = {},
  onRetry,
  onClearFilters,
  onTogglePublished,
  onEdit,
  onDelete,
}) => {
  if (!loaded) {
    if (error) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onRetry} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Retry
            </Button>
          }
        >
          {error.message || 'Could not load the experiences.'}
        </Alert>
      );
    }
    return <LoadingGrid />;
  }

  if (items.length === 0) {
    if (hasFilters && totalExperiences > 0) {
      return (
        <Message
          icon={<NoMatchIcon color="disabled" fontSize="large" aria-hidden />}
          title="No experiences match"
          action={
            <Button variant="outlined" onClick={onClearFilters} sx={{ textTransform: 'none', borderRadius: '10px' }}>
              Clear filters
            </Button>
          }
        >
          Nothing matches your search or filter. Try a different word, or clear the filters to see everything.
        </Message>
      );
    }
    return (
      <Message icon={<EmptyIcon color="disabled" fontSize="large" aria-hidden />} title="No experiences yet">
        Once experiences are created, they will appear here, and published ones will show up for children under Explore.
      </Message>
    );
  }

  return (
    <Box>
      {loading && <LinearProgress aria-label="Refreshing the list" sx={{ mb: 1.5, borderRadius: 1 }} />}
      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={onRetry} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Retry
            </Button>
          }
        >
          {error.message || 'Could not refresh the list.'} The experiences below may be out of date.
        </Alert>
      )}
      <Grid container spacing={2}>
        {items.map((experience) => (
          <Grid key={experience.uuid} item {...GRID_ITEM}>
            <ExperienceCard
              experience={experience}
              busy={busy[experience.uuid] || null}
              onTogglePublished={onTogglePublished}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ExperiencesList;
