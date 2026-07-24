import React from 'react';
import {
  Box,
  Radio,
  Chip,
  CircularProgress,
  Avatar,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import UnpublishedRoundedIcon from '@mui/icons-material/UnpublishedRounded';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { canManageContent } from '../../../utils/contentOwnership';

const statusColor = {
  draft: 'warning',
  published: 'success',
  archived: 'default',
};

const StarCamMissionTable = ({
  missions = [],
  loading = false,
  selectedMissionId = null,
  currentUser = null,
  onToggleMission,
  onEditMission,
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
            <TableCell sx={{ fontWeight: 700 }}>Image</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
            {/* <TableCell sx={{ fontWeight: 700 }}>Media Ready</TableCell> */}
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
              const isSelected = selectedMissionId === mission._id;
              const canManage = canManageContent(mission, currentUser);
              return (
                <TableRow
                  key={mission._id}
                  hover
                  selected={isSelected}
                  onClick={() => onToggleMission(mission._id, !isSelected)}
                  sx={{ cursor: 'pointer' }}
                >
                    <TableCell align="center">
                      <Radio
                        size="small"
                        checked={isSelected}
                        onChange={(e) => onToggleMission(mission._id, e.target.checked)}
                        inputProps={{ 'aria-label': `select mission ${mission.missionId}` }}
                      />
                    </TableCell>
                    <TableCell>{mission.missionId}</TableCell>
                    <TableCell>
                      <Avatar
                        variant="rounded"
                        src={mission.missionImageUrl || mission.missionImage?.url || ''}
                        alt={`${mission.title || mission.missionId} mission`}
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '10px',
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>{mission.title}</TableCell>
                    <TableCell>
                      <Chip size="small" label={mission.status} color={statusColor[mission.status] || 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      {canManage ? (
                        <Box sx={{ display: 'inline-flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit mission">
                            <IconButton
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditMission(mission);
                              }}
                              aria-label={`edit mission ${mission.missionId}`}
                              sx={{ p: 0.7 }}
                            >
                              <EditRoundedIcon sx={{ fontSize: 24 }} />
                            </IconButton>
                          </Tooltip>
                          {mission.status !== 'published' && mission.status !== 'archived' ? (
                            <Tooltip title="Publish mission">
                              <IconButton
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPublishMission(mission._id);
                                }}
                                aria-label={`publish mission ${mission.missionId}`}
                                sx={{ p: 0.7 }}
                              >
                                <PublishRoundedIcon sx={{ fontSize: 24 }} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          {mission.status === 'published' ? (
                            <Tooltip title="Unpublish mission">
                              <IconButton
                                color="warning"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnpublishMission(mission._id);
                                }}
                                aria-label={`unpublish mission ${mission.missionId}`}
                                sx={{ p: 0.7 }}
                              >
                                <UnpublishedRoundedIcon sx={{ fontSize: 24 }} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          {mission.status !== 'archived' ? (
                            <Tooltip title="Archive mission">
                              <IconButton
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onArchiveMission(mission._id);
                                }}
                                aria-label={`archive mission ${mission.missionId}`}
                                sx={{ p: 0.7 }}
                              >
                                <ArchiveRoundedIcon sx={{ fontSize: 24 }} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          View only
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StarCamMissionTable;

