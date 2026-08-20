import React, { useMemo, useState } from 'react';
import { Alert, Box, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDispatch } from 'react-redux';
import useAdminNotifications from '../../hooks/useAdminNotifications';
import { showConfirmationDialog } from '../../store/slices/uiSlice';
import NotificationsHeader from '../../components/admin/notifications/NotificationsHeader';
import NotificationsFilters from '../../components/admin/notifications/NotificationsFilters';
import NotificationsTable from '../../components/admin/notifications/NotificationsTable';
import NotificationsPagination from '../../components/admin/notifications/NotificationsPagination';
import NotificationCampaignForm from '../../components/admin/notifications/NotificationCampaignForm';
import NotificationPreviewDialog from '../../components/admin/notifications/NotificationPreviewDialog';

const AdminNotifications = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    meta,
    campaigns,
    pagination,
    filters,
    setFilters,
    loading,
    saving,
    uploadingLanguage,
    error,
    saveCampaign,
    scheduleCampaign,
    sendNowCampaign,
    sendTestCampaign,
    cancelCampaign,
    duplicateCampaign,
    previewCampaign,
    uploadLocalizationImage,
    buildEmptyForm,
    campaignToForm,
  } = useAdminNotifications();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => buildEmptyForm());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewCampaignId, setPreviewCampaignId] = useState(null);

  const typeLabels = useMemo(() => {
    const map = {};
    (meta?.types || []).forEach((item) => {
      map[item.value] = item.label;
    });
    return map;
  }, [meta]);

  const closeForm = () => setFormOpen(false);

  const openCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setForm(buildEmptyForm());
    setFormOpen(true);
  };

  const openEdit = (campaign) => {
    setFormMode('edit');
    setEditingId(campaign._id);
    setForm(campaignToForm(campaign));
    setFormOpen(true);
  };

  const rememberCampaignId = (id) => {
    if (!id) return;
    setEditingId(id);
    setFormMode('edit');
  };

  const handleSave = async () => {
    try {
      const saved = await saveCampaign(form, editingId);
      rememberCampaignId(saved?._id);
      closeForm();
    } catch {
      // already notified
    }
  };

  const handleSchedule = async () => {
    try {
      const saved = await scheduleCampaign(form, editingId);
      rememberCampaignId(saved?._id);
      closeForm();
    } catch (err) {
      rememberCampaignId(err?.campaignId);
    }
  };

  const handleSendNow = () => {
    dispatch(
      showConfirmationDialog({
        title: 'Send this campaign now?',
        message:
          'This sends the notification to all matching recipients immediately. The campaign will be marked sent (or failed) and cannot be edited afterwards.',
        type: 'warning',
        confirmText: 'Send now',
        cancelText: 'Keep editing',
        onConfirm: async () => {
          try {
            await sendNowCampaign(form, editingId);
            closeForm();
          } catch (err) {
            rememberCampaignId(err?.campaignId);
          }
        },
      })
    );
  };

  const handleSendTest = () => {
    dispatch(
      showConfirmationDialog({
        title: 'Send a test notification?',
        message:
          'This sends only to the designated test account (or the test user id you entered). The campaign will stay draft or scheduled and will not fan out to all users.',
        type: 'info',
        confirmText: 'Send test',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            const saved = await sendTestCampaign(form, editingId);
            rememberCampaignId(saved?.campaign?._id || saved?._id);
          } catch (err) {
            rememberCampaignId(err?.campaignId);
          }
        },
      })
    );
  };

  const handleCancelCampaign = (campaign) => {
    dispatch(
      showConfirmationDialog({
        title: 'Cancel this scheduled send?',
        message: `"${campaign.internalName}" will not go out. You can duplicate it later if you need to send it again.`,
        type: 'warning',
        confirmText: 'Cancel send',
        cancelText: 'Keep scheduled',
        onConfirm: async () => {
          try {
            await cancelCampaign(campaign._id);
          } catch {
            // already notified
          }
        },
      })
    );
  };

  const handlePreview = async (campaign, language) => {
    const lang = language || campaign.localizations?.[0]?.languageCode || 'en';
    const data = await previewCampaign(campaign._id, lang);
    setPreviewCampaignId(campaign._id);
    setPreview(data);
    setPreviewOpen(true);
  };

  const handlePreviewLanguage = async (language) => {
    if (!previewCampaignId) return;
    const data = await previewCampaign(previewCampaignId, language);
    setPreview(data);
  };

  return (
    <Box>
      <Paper
        sx={{
          p: 3.5,
          mb: 3,
          mt: 2,
          borderRadius: '16px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <NotificationsHeader onCreate={openCreate} />
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <NotificationsFilters
          status={filters.status}
          type={filters.type}
          search={filters.search}
          types={meta?.types || []}
          statuses={meta?.statuses || []}
          onStatusChange={(status) => setFilters((current) => ({ ...current, status, page: 1 }))}
          onTypeChange={(type) => setFilters((current) => ({ ...current, type, page: 1 }))}
          onSearch={(search) => setFilters((current) => ({ ...current, search, page: 1 }))}
        />
        <NotificationsTable
          rows={campaigns}
          loading={loading}
          typeLabels={typeLabels}
          onEdit={openEdit}
          onPreview={(row) => handlePreview(row)}
          onDuplicate={(row) => duplicateCampaign(row._id)}
          onCancel={handleCancelCampaign}
        />
        <NotificationsPagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      </Paper>

      <NotificationCampaignForm
        open={formOpen}
        mode={formMode}
        form={form}
        meta={meta}
        saving={saving}
        uploadingLanguage={uploadingLanguage}
        onChange={setForm}
        onClose={closeForm}
        onSave={handleSave}
        onSchedule={handleSchedule}
        onSendNow={handleSendNow}
        onSendTest={handleSendTest}
        onUploadImage={uploadLocalizationImage}
      />

      <NotificationPreviewDialog
        open={previewOpen}
        languages={meta?.languages || []}
        preview={preview}
        onClose={() => setPreviewOpen(false)}
        onLanguageChange={handlePreviewLanguage}
      />
    </Box>
  );
};

export default AdminNotifications;
