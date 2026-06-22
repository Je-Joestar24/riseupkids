import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import starCamLabelCatalogService from '../services/starCamLabelCatalogService';
import {
  buildAddCustomOption,
  normalizeVisionTarget,
  toLabelSelection,
} from '../utils/starCamVisionLabel.util';

export { ADD_CUSTOM_OPTION_PREFIX, buildAddCustomOption, normalizeVisionTarget, toLabelSelection } from '../utils/starCamVisionLabel.util';

const DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 2;

function mergeOptions({ results = [], query = '', recentCustom = [] }) {
  const safeQuery = normalizeVisionTarget(query);
  const map = new Map();

  for (const entry of recentCustom) {
    const key = normalizeVisionTarget(entry?.searchKey || entry?.displayName);
    if (key) map.set(key, { ...entry, __fromRecent: true });
  }

  for (const entry of results) {
    const key = normalizeVisionTarget(entry?.searchKey || entry?.displayName);
    if (key) map.set(key, entry);
  }

  const merged = Array.from(map.values());
  const hasExact =
    safeQuery.length >= MIN_QUERY_LENGTH &&
    merged.some((entry) => normalizeVisionTarget(entry?.searchKey || entry?.displayName) === safeQuery);

  if (safeQuery.length >= MIN_QUERY_LENGTH && !hasExact) {
    merged.unshift(buildAddCustomOption(query.trim()));
  }

  return merged;
}

export default function useStarCamLabelSearch({ enabled = true, includeRecentOnOpen = true } = {}) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [recentCustom, setRecentCustom] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);

  const loadRecentCustom = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await starCamLabelCatalogService.listRecentCustomLabels({ limit: 12 });
      setRecentCustom(Array.isArray(data?.results) ? data.results : []);
    } catch {
      setRecentCustom([]);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !includeRecentOnOpen) return undefined;
    void loadRecentCustom();
    return undefined;
  }, [enabled, includeRecentOnOpen, loadRecentCustom]);

  const runSearch = useCallback(
    async (query) => {
      const trimmed = String(query || '').trim();
      const normalized = normalizeVisionTarget(trimmed);

      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      if (!enabled || normalized.length < MIN_QUERY_LENGTH) {
        setLoading(false);
        setError(null);
        setOptions(
          mergeOptions({
            results: [],
            query: trimmed,
            recentCustom: includeRecentOnOpen ? recentCustom : [],
          })
        );
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setLoading(true);
      setError(null);

      try {
        const data = await starCamLabelCatalogService.searchLabels({
          query: trimmed,
          limit: 20,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        const results = Array.isArray(data?.results) ? data.results : [];
        setOptions(
          mergeOptions({
            results,
            query: trimmed,
            recentCustom: [],
          })
        );
      } catch (searchError) {
        if (searchError?.name === 'CanceledError' || searchError?.code === 'ERR_CANCELED') return;
        if (requestId !== requestIdRef.current) return;
        setError(searchError?.message || 'Search failed');
        setOptions(mergeOptions({ results: [], query: trimmed, recentCustom: [] }));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [enabled, includeRecentOnOpen, recentCustom]
  );

  const handleInputChange = useCallback(
    (nextValue) => {
      setInputValue(nextValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runSearch(nextValue);
      }, DEBOUNCE_MS);
    },
    [runSearch]
  );

  const resetSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setInputValue('');
    setOptions([]);
    setError(null);
    setLoading(false);
  }, []);

  const createCustomLabel = useCallback(
    async (displayName) => {
      const trimmed = String(displayName || '').trim();
      if (!trimmed) return null;

      setCreating(true);
      setError(null);
      try {
        const created = await starCamLabelCatalogService.createCustomLabel({
          displayName: trimmed,
          defaultTerms: [normalizeVisionTarget(trimmed)],
        });
        await loadRecentCustom();
        return toLabelSelection(created);
      } catch (createError) {
        if (createError?.statusCode === 409 && createError?.existingLabelId) {
          setError('This label already exists in the catalog.');
        } else {
          setError(createError?.message || 'Failed to add custom label');
        }
        return null;
      } finally {
        setCreating(false);
      }
    },
    [loadRecentCustom]
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    },
    []
  );

  const optionLabels = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        optionKey: option.isAddCustom ? option.labelId : `${option.source}:${option.labelId}`,
      })),
    [options]
  );

  return {
    inputValue,
    setInputValue,
    handleInputChange,
    options: optionLabels,
    loading,
    creating,
    error,
    resetSearch,
    createCustomLabel,
    loadRecentCustom,
    minQueryLength: MIN_QUERY_LENGTH,
  };
}
