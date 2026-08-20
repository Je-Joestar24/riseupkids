import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import adminNotificationsService from '../services/adminNotificationsService';
import { showNotification } from '../store/slices/uiSlice';

const DEFAULT_FILTERS = { page: 1, limit: 10, status: '', type: '', search: '' };
export const DEFAULT_NOTIFICATION_TIMEZONE = 'America/Sao_Paulo';
export const EDITABLE_CAMPAIGN_STATUSES = ['draft', 'scheduled'];

const emptyLocalization = () => ({
  title: '',
  message: '',
  imageMediaId: null,
  imageUrl: null,
  width: null,
  height: null,
});

function normalizeSendTime(value) {
  const raw = String(value || '').trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);
  return raw;
}

export function defaultTimezone(meta) {
  const zones = meta?.timezones || [];
  if (zones.includes(DEFAULT_NOTIFICATION_TIMEZONE)) return DEFAULT_NOTIFICATION_TIMEZONE;
  return zones[0] || DEFAULT_NOTIFICATION_TIMEZONE;
}

export function isEditableCampaignStatus(status) {
  return !status || EDITABLE_CAMPAIGN_STATUSES.includes(status);
}

export function formatCampaignSchedule(campaign) {
  if (campaign?.sendLocalDate && campaign?.sendLocalTime && campaign?.timezone) {
    return `${campaign.sendLocalDate} ${campaign.sendLocalTime} (${campaign.timezone})`;
  }
  if (campaign?.sendAt) {
    return new Date(campaign.sendAt).toISOString();
  }
  return '—';
}

export function buildEmptyForm(meta) {
  const languages = meta?.languages || [];
  const localizations = {};
  languages.forEach((lang) => {
    localizations[lang.code] = emptyLocalization();
  });
  return {
    internalName: '',
    type: meta?.types?.[0]?.value || '',
    audience: 'all',
    destinationKind: meta?.destinationKinds?.[0]?.value || 'home',
    contentId: '',
    status: 'draft',
    sendDate: '',
    sendTime: '',
    timezone: defaultTimezone(meta),
    testUserId: '',
    localizations,
  };
}

export function campaignToForm(campaign, meta) {
  const base = buildEmptyForm(meta);
  const localizations = { ...base.localizations };
  (campaign.localizations || []).forEach((entry) => {
    const image = entry.imageMediaId && typeof entry.imageMediaId === 'object' ? entry.imageMediaId : null;
    localizations[entry.languageCode] = {
      title: entry.title || '',
      message: entry.message || '',
      imageMediaId: image?._id || entry.imageMediaId || null,
      imageUrl: image?.url || null,
      width: image?.width || null,
      height: image?.height || null,
    };
  });
  return {
    internalName: campaign.internalName || '',
    type: campaign.type || base.type,
    audience: campaign.audience || 'all',
    destinationKind: campaign.destination?.kind || base.destinationKind,
    contentId: campaign.destination?.contentId || '',
    status: campaign.status || 'draft',
    sendDate: campaign.sendLocalDate || '',
    sendTime: normalizeSendTime(campaign.sendLocalTime),
    timezone: campaign.timezone || base.timezone,
    testUserId: '',
    localizations,
  };
}

export function formToPayload(form) {
  const localizations = Object.entries(form.localizations || {})
    .filter(([, value]) => String(value.title || '').trim() && String(value.message || '').trim())
    .map(([languageCode, value]) => ({
      languageCode,
      title: value.title,
      message: value.message,
      imageMediaId: value.imageMediaId || null,
    }));

  return {
    internalName: form.internalName,
    type: form.type,
    audience: form.audience,
    destination: {
      kind: form.destinationKind,
      contentId: form.contentId || null,
    },
    localizations,
  };
}

export function formToSchedulePayload(form) {
  const sendDate = String(form.sendDate || '').trim();
  const sendTime = normalizeSendTime(form.sendTime);
  const timezone = String(form.timezone || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sendDate)) {
    throw new Error('Send date is required (YYYY-MM-DD)');
  }
  if (!/^\d{2}:\d{2}$/.test(sendTime)) {
    throw new Error('Send time is required (HH:mm)');
  }
  if (!timezone) {
    throw new Error('Timezone is required');
  }
  return { sendDate, sendTime, timezone };
}

export default function useAdminNotifications() {
  const dispatch = useDispatch();
  const [meta, setMeta] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLanguage, setUploadingLanguage] = useState(null);
  const [error, setError] = useState(null);

  const notifyError = useCallback(
    (err, fallback) => {
      const message = err?.message || fallback;
      setError(message);
      dispatch(showNotification({ message, type: 'error' }));
    },
    [dispatch]
  );

  const loadMeta = useCallback(async () => {
    try {
      const response = await adminNotificationsService.getMeta();
      setMeta(response.data);
      return response.data;
    } catch (err) {
      notifyError(err, 'Failed to load notification settings');
      return null;
    }
  }, [notifyError]);

  const loadCampaigns = useCallback(
    async (query = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params = { ...filters, ...query };
        const response = await adminNotificationsService.list({
          page: params.page,
          limit: params.limit,
          status: params.status || undefined,
          type: params.type || undefined,
          search: params.search || undefined,
        });
        setCampaigns(response.data || []);
        setPagination(response.pagination || { page: params.page, limit: params.limit, total: 0, pages: 0 });
      } catch (err) {
        notifyError(err, 'Failed to load notification campaigns');
      } finally {
        setLoading(false);
      }
    },
    [filters, notifyError]
  );

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadCampaigns();
  }, [filters.page, filters.status, filters.type, filters.search, filters.limit]);

  const saveCampaign = useCallback(
    async (form, campaignId, options = {}) => {
      const { notify = true, reload = true } = options;
      setSaving(true);
      try {
        const payload = formToPayload(form);
        const response = campaignId
          ? await adminNotificationsService.update(campaignId, payload)
          : await adminNotificationsService.create(payload);
        if (notify) {
          dispatch(
            showNotification({
              message: campaignId ? 'Campaign updated' : 'Campaign created',
              type: 'success',
            })
          );
        }
        if (reload) await loadCampaigns();
        return response.data;
      } catch (err) {
        notifyError(err, 'Failed to save campaign');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [dispatch, loadCampaigns, notifyError]
  );

  const persistThen = useCallback(async (form, campaignId) => {
    const payload = formToPayload(form);
    const response = campaignId
      ? await adminNotificationsService.update(campaignId, payload)
      : await adminNotificationsService.create(payload);
    return response.data;
  }, []);

  const scheduleCampaign = useCallback(
    async (form, campaignId) => {
      let payload;
      try {
        payload = formToSchedulePayload(form);
      } catch (err) {
        notifyError(err, err.message);
        throw err;
      }
      setSaving(true);
      try {
        const saved = await persistThen(form, campaignId);
        try {
          const response = await adminNotificationsService.schedule(saved._id, payload);
          dispatch(showNotification({ message: 'Campaign scheduled', type: 'success' }));
          await loadCampaigns();
          return response.data;
        } catch (err) {
          if (err) err.campaignId = saved._id;
          throw err;
        }
      } catch (err) {
        notifyError(err, 'Failed to schedule campaign');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [dispatch, loadCampaigns, notifyError, persistThen]
  );

  const sendNowCampaign = useCallback(
    async (form, campaignId) => {
      setSaving(true);
      try {
        const saved = form ? await persistThen(form, campaignId) : { _id: campaignId };
        try {
          const response = await adminNotificationsService.sendNow(saved._id);
          const status = response.data?.status;
          dispatch(
            showNotification({
              message: status === 'failed' ? 'Campaign send completed with failures' : 'Campaign sent',
              type: status === 'failed' ? 'warning' : 'success',
            })
          );
          await loadCampaigns();
          return response.data;
        } catch (err) {
          if (err) err.campaignId = saved._id;
          throw err;
        }
      } catch (err) {
        notifyError(err, 'Failed to send campaign');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [dispatch, loadCampaigns, notifyError, persistThen]
  );

  const sendTestCampaign = useCallback(
    async (form, campaignId) => {
      setSaving(true);
      try {
        const saved = form ? await persistThen(form, campaignId) : { _id: campaignId };
        const testUserId = String(form?.testUserId || '').trim() || undefined;
        try {
          const response = await adminNotificationsService.sendTest(saved._id, testUserId);
          const targeted = response.data?.targeted ?? response.data?.receipts?.length ?? 1;
          dispatch(
            showNotification({
              message: `Test notification sent (${targeted} recipient)`,
              type: 'success',
            })
          );
          await loadCampaigns();
          return response.data;
        } catch (err) {
          if (err) err.campaignId = saved._id;
          throw err;
        }
      } catch (err) {
        notifyError(err, 'Failed to send test notification');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [dispatch, loadCampaigns, notifyError, persistThen]
  );

  const cancelCampaign = useCallback(
    async (id) => {
      setSaving(true);
      try {
        const response = await adminNotificationsService.cancel(id);
        dispatch(showNotification({ message: 'Campaign cancelled', type: 'success' }));
        await loadCampaigns();
        return response.data;
      } catch (err) {
        notifyError(err, 'Failed to cancel campaign');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [dispatch, loadCampaigns, notifyError]
  );

  const duplicateCampaign = useCallback(
    async (id) => {
      try {
        const response = await adminNotificationsService.duplicate(id);
        dispatch(showNotification({ message: 'Campaign duplicated', type: 'success' }));
        await loadCampaigns();
        return response.data;
      } catch (err) {
        notifyError(err, 'Failed to duplicate campaign');
        throw err;
      }
    },
    [dispatch, loadCampaigns, notifyError]
  );

  const previewCampaign = useCallback(
    async (id, language) => {
      try {
        const response = await adminNotificationsService.preview(id, language);
        return response.data;
      } catch (err) {
        notifyError(err, 'Failed to preview campaign');
        throw err;
      }
    },
    [notifyError]
  );

  const uploadLocalizationImage = useCallback(
    async (file, languageCode, _form, setForm) => {
      setUploadingLanguage(languageCode);
      try {
        const response = await adminNotificationsService.uploadImage(file);
        const media = response.data;
        setForm((current) => ({
          ...current,
          localizations: {
            ...current.localizations,
            [languageCode]: {
              ...current.localizations[languageCode],
              imageMediaId: media._id,
              imageUrl: media.url,
              width: media.width,
              height: media.height,
            },
          },
        }));
        dispatch(showNotification({ message: 'Image uploaded', type: 'success' }));
        return media;
      } catch (err) {
        notifyError(err, 'Failed to upload image');
        throw err;
      } finally {
        setUploadingLanguage(null);
      }
    },
    [dispatch, notifyError]
  );

  return {
    meta,
    campaigns,
    pagination,
    filters,
    setFilters,
    loading,
    saving,
    uploadingLanguage,
    error,
    loadCampaigns,
    saveCampaign,
    scheduleCampaign,
    sendNowCampaign,
    sendTestCampaign,
    cancelCampaign,
    duplicateCampaign,
    previewCampaign,
    uploadLocalizationImage,
    buildEmptyForm: () => buildEmptyForm(meta),
    campaignToForm: (campaign) => campaignToForm(campaign, meta),
  };
}
