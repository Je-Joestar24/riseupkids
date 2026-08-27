import { useCallback, useEffect, useState } from 'react';
import adminNotificationsService from '../services/adminNotificationsService';

const DEFAULT_FILTERS = { range: '30d', type: '', status: '', audience: '' };

export default function useNotificationDashboard(initial = {}) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initial });
  const [meta, setMeta] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminNotificationsService.getDashboard({
        range: filters.range,
        type: filters.type || undefined,
        status: filters.status || undefined,
        audience: filters.audience || undefined,
      });
      setData(response.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load notification dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.range, filters.type, filters.status, filters.audience]);

  useEffect(() => {
    let cancelled = false;
    adminNotificationsService
      .getMeta()
      .then((response) => {
        if (!cancelled) setMeta(response.data || null);
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, meta, loading, error, filters, setFilters, reload: load };
}
