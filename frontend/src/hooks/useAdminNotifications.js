import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import adminNotificationsService from '../services/adminNotificationsService';
import { showNotification } from '../store/slices/uiSlice';

const DEFAULT_FILTERS = { page: 1, limit: 10, status: '', type: '', search: '' };

const emptyLocalization = () => ({
  title: '',
  message: '',
  imageMediaId: null,
  imageUrl: null,
  width: null,
  height: null,
});

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
    async (form, campaignId) => {
      setSaving(true);
      try {
        const payload = formToPayload(form);
        const response = campaignId
          ? await adminNotificationsService.update(campaignId, payload)
          : await adminNotificationsService.create(payload);
        dispatch(
          showNotification({
            message: campaignId ? 'Campaign updated' : 'Campaign created',
            type: 'success',
          })
        );
        await loadCampaigns();
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
    duplicateCampaign,
    previewCampaign,
    uploadLocalizationImage,
    buildEmptyForm: () => buildEmptyForm(meta),
    campaignToForm: (campaign) => campaignToForm(campaign, meta),
  };
}
