import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const statusColor = {
  draft: 'warning',
  published: 'success',
  archived: 'default',
};

const StarCamMissionTable = ({
  missions = [],
  loading = false,
  selectedMissionId = null,
  onToggleMission,
  onPublishMission,
  onUnpublishMission,
  onArchiveMission,
}) => {
  const theme = useTheme();

  if (loading && missions.length === 0) {
    return (
      <Paper sx={{ p: 4, borderRadius: '12px', textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }} align="center">
              Select
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Mission ID</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Vocabulary</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {missions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
                  No missions found.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            missions.map((mission) => {
              const isExpanded = selectedMissionId === mission._id;
              const vocabList = Array.isArray(mission.vocab) ? mission.vocab : [];
              return (
                <React.Fragment key={mission._id}>
                  <TableRow hover>
                    <TableCell align="center">
                      <Checkbox
                        size="small"
                        checked={isExpanded}
                        onChange={(e) => onToggleMission(mission._id, e.target.checked)}
                        inputProps={{ 'aria-label': `select mission ${mission.missionId}` }}
                      />
                    </TableCell>
                    <TableCell>{mission.missionId}</TableCell>
                    <TableCell>{mission.title}</TableCell>
                    <TableCell>{mission.category?.name || 'Uncategorized'}</TableCell>
                    <TableCell>{Number(mission.vocabCount ?? vocabList.length ?? 0)}/7</TableCell>
                    <TableCell>
                      <Chip size="small" label={mission.status} color={statusColor[mission.status] || 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', gap: 0.6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {mission.status !== 'published' && mission.status !== 'archived' ? (
                          <Button size="small" variant="contained" onClick={() => onPublishMission(mission._id)}>
                            Publish
                          </Button>
                        ) : null}
                        {mission.status === 'published' ? (
                          <Button size="small" variant="outlined" color="warning" onClick={() => onUnpublishMission(mission._id)}>
                            Unpublish
                          </Button>
                        ) : null}
                        {mission.status !== 'archived' ? (
                          <Button size="small" variant="outlined" color="error" onClick={() => onArchiveMission(mission._id)}>
                            Archive
                          </Button>
                        ) : null}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 2, py: 1.5, backgroundColor: theme.palette.custom?.bgSecondary || '#f8fafc' }}>
                          <Typography sx={{ fontWeight: 700, mb: 0.8 }}>Vocabulary List</Typography>
                          {vocabList.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No vocabulary yet.
                            </Typography>
                          ) : (
                            <List dense sx={{ py: 0 }}>
                              {vocabList
                                .slice()
                                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                                .map((vocab, idx) => (
                                  <ListItem key={`${mission._id}-v-${idx}`} sx={{ px: 0 }}>
                                    <ListItemText
                                      primary={`${vocab.displayText || vocab.word || '-'} (${vocab.target || '-'})`}
                                      secondary={`Order: ${vocab.sortOrder ?? idx}`}
                                    />
                                  </ListItem>
                                ))}
                            </List>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StarCamMissionTable;

