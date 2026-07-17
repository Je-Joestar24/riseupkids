/**
 * On-screen CMS video playback debugger for APK/device diagnosis.
 * Enable with EXPO_PUBLIC_CMS_VIDEO_DEBUG=true (also auto-shows after errors / stuck load).
 */

import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE_URL, APP_VERSION } from '@/config';
import { Quicksand } from '@/constants/theme';

export const CMS_VIDEO_DEBUG_ENABLED = process.env.EXPO_PUBLIC_CMS_VIDEO_DEBUG === 'true';

export function shouldShowCmsVideoDebugPanel(options: {
  failed?: boolean;
  stuckLoading?: boolean;
}): boolean {
  if (CMS_VIDEO_DEBUG_ENABLED || __DEV__) return true;
  return Boolean(options.failed || options.stuckLoading);
}

export interface CmsVideoPlaybackDebugContext {
  scene?: string;
  pageId?: string;
  pageType?: string;
  bookId?: string | null;
  pageVideoUrl?: string | null;
  playbackUriProp?: string | null;
  remoteUri?: string | null;
  localUri?: string | null;
  activeSource?: string | null;
  candidates?: string[];
  candidateIndex?: number;
  isBunnyEmbed?: boolean;
  ready?: boolean;
  failed?: boolean;
  stuckLoading?: boolean;
  lastError?: string | null;
  localFileExists?: boolean | null;
  localFileSize?: number | null;
  uriMapRemote?: string | null;
  uriMapResolved?: string | null;
  playbackEngine?: 'expo-av' | 'webview' | 'bunny';
  extraLines?: string[];
}

function formatDebugReport(ctx: CmsVideoPlaybackDebugContext): string {
  const lines = buildDebugRows(ctx).map((row) => `${row.label}: ${row.value}`);
  return ['=== CMS VIDEO DEBUG ===', ...lines, '=== END ==='].join('\n');
}

function buildDebugRows(ctx: CmsVideoPlaybackDebugContext): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: 'time', value: new Date().toISOString() },
    { label: 'platform', value: `${Platform.OS} ${String(Platform.Version)}` },
    { label: 'app', value: APP_VERSION },
    { label: 'api', value: API_BASE_URL },
    {
      label: 'debugFlag',
      value: CMS_VIDEO_DEBUG_ENABLED ? 'EXPO_PUBLIC_CMS_VIDEO_DEBUG=true' : 'off',
    },
    { label: 'scene', value: ctx.scene ?? 'unknown' },
    { label: 'pageId', value: ctx.pageId ?? 'n/a' },
    { label: 'pageType', value: ctx.pageType ?? 'n/a' },
    { label: 'bookId', value: ctx.bookId ?? 'n/a' },
    { label: 'isBunnyEmbed', value: String(Boolean(ctx.isBunnyEmbed)) },
    { label: 'ready', value: String(Boolean(ctx.ready)) },
    { label: 'failed', value: String(Boolean(ctx.failed)) },
    { label: 'stuckLoading', value: String(Boolean(ctx.stuckLoading)) },
    { label: 'candidateIndex', value: String(ctx.candidateIndex ?? 0) },
    { label: 'pageVideoUrl', value: ctx.pageVideoUrl ?? 'n/a' },
    { label: 'playbackUriProp', value: ctx.playbackUriProp ?? 'n/a' },
    { label: 'remoteUri', value: ctx.remoteUri ?? 'n/a' },
    { label: 'localUri', value: ctx.localUri ?? 'n/a' },
    { label: 'activeSource', value: ctx.activeSource ?? 'n/a' },
    { label: 'uriMapRemote', value: ctx.uriMapRemote ?? 'n/a' },
    { label: 'uriMapResolved', value: ctx.uriMapResolved ?? 'n/a' },
    { label: 'playbackEngine', value: ctx.playbackEngine ?? 'n/a' },
    {
      label: 'localFileExists',
      value: ctx.localFileExists == null ? 'n/a' : String(ctx.localFileExists),
    },
    {
      label: 'localFileSize',
      value: ctx.localFileSize == null ? 'n/a' : String(ctx.localFileSize),
    },
    { label: 'lastError', value: ctx.lastError ?? 'none' },
  ];

  const candidates = ctx.candidates ?? [];
  if (candidates.length) {
    candidates.forEach((url, index) => {
      rows.push({ label: `candidate[${index}]`, value: url });
    });
  } else {
    rows.push({ label: 'candidates', value: 'none' });
  }

  (ctx.extraLines ?? []).forEach((line, index) => {
    rows.push({ label: `extra[${index}]`, value: line });
  });

  return rows;
}

export interface CmsVideoPlaybackDebugPanelProps {
  visible: boolean;
  context: CmsVideoPlaybackDebugContext;
}

function DebugRow({ label, value }: { label: string; value: string }) {
  const highlight =
    label === 'lastError' && value !== 'none' ||
    label === 'failed' && value === 'true' ||
    label === 'localFileExists' && value === 'false';

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueAlert]} selectable>
        {value}
      </Text>
    </View>
  );
}

export function CmsVideoPlaybackDebugPanel({ visible, context }: CmsVideoPlaybackDebugPanelProps) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [minimized, setMinimized] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const rows = useMemo(() => buildDebugRows(context), [context]);
  const report = useMemo(() => formatDebugReport(context), [context]);

  const handleShare = useCallback(async () => {
    try {
      const result = await Share.share({ message: report, title: 'CMS Video Debug' });
      if (result.action === Share.sharedAction) {
        setShareStatus('Shared — check the app you picked');
      } else {
        setShareStatus('Share cancelled');
      }
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : 'Share failed');
    }
    setTimeout(() => setShareStatus(null), 4000);
  }, [report]);

  if (!visible) return null;

  if (minimized) {
    return (
      <Pressable
        style={[styles.minimizedChip, { top: insets.top + 8 }]}
        onPress={() => setMinimized(false)}
        accessibilityRole="button"
        accessibilityLabel="Expand CMS video debug panel"
      >
        <Text style={styles.minimizedChipText}>CMS Debug ▼</Text>
      </Pressable>
    );
  }

  const panelMaxHeight = Math.max(320, winH - insets.top - insets.bottom - 16);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => setMinimized(true)}>
      <View style={[styles.modalRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.panel, { maxHeight: panelMaxHeight }]}>
          <View style={styles.header}>
            <Text style={styles.title}>CMS Video Debug</Text>
            <Pressable
              onPress={() => setMinimized(true)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Minimize debug panel"
            >
              <Text style={styles.iconBtnText}>−</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Scroll to see all fields. Long-press any value to copy. Screenshot the full panel if Share fails.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {rows.map((row, index) => (
              <DebugRow key={`${row.label}-${index}`} label={row.label} value={row.value} />
            ))}
          </ScrollView>

          {shareStatus ? <Text style={styles.statusText}>{shareStatus}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={() => void handleShare()} accessibilityRole="button">
              <Text style={styles.actionBtnText}>Share (optional)</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => setMinimized(true)}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnTextSecondary}>Minimize</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export async function probeLocalMediaFile(uri: string | null | undefined): Promise<{
  exists: boolean | null;
  size: number | null;
  error?: string;
}> {
  if (!uri || !uri.startsWith('file://')) {
    return { exists: null, size: null };
  }
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return {
      exists: Boolean(info.exists),
      size: info.exists && typeof info.size === 'number' ? info.size : null,
    };
  } catch (error) {
    return {
      exists: false,
      size: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
  },
  panel: {
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: Quicksand.bold,
    fontSize: 16,
    color: '#fbbf24',
  },
  hint: {
    fontFamily: Quicksand.semiBold,
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 10,
    lineHeight: 16,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  row: {
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.35)',
    paddingBottom: 8,
  },
  rowLabel: {
    fontFamily: Quicksand.bold,
    fontSize: 11,
    color: '#fbbf24',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
    color: '#e2e8f0',
    flexWrap: 'wrap',
  },
  rowValueAlert: {
    color: '#fca5a5',
  },
  statusText: {
    fontFamily: Quicksand.semiBold,
    fontSize: 11,
    color: '#93c5fd',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  actionBtnText: {
    fontFamily: Quicksand.bold,
    fontSize: 12,
    color: '#0f172a',
  },
  actionBtnTextSecondary: {
    fontFamily: Quicksand.bold,
    fontSize: 12,
    color: '#e2e8f0',
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  iconBtnText: {
    fontFamily: Quicksand.bold,
    fontSize: 22,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  minimizedChip: {
    position: 'absolute',
    left: 8,
    zIndex: 60,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  minimizedChipText: {
    fontFamily: Quicksand.bold,
    fontSize: 12,
    color: '#fbbf24',
  },
});
