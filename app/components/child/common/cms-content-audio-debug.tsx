/**
 * On-screen CMS content-page audio debugger (short-clip / iOS silent failures).
 * Enable with EXPO_PUBLIC_CMS_AUDIO_DEBUG=true (restart Metro after changing .env).
 * Missing / false / any other value = forced off in every environment.
 *
 * Uses an absolute overlay (not a nested Modal) so it works inside the book player Modal.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { API_BASE_URL, APP_VERSION } from '@/config';
import { Quicksand } from '@/constants/theme';

/** Only the exact string "true" enables the overlay. Missing/false/empty → off. */
export function isCmsAudioDebugEnvEnabled(
  raw: string | undefined = process.env.EXPO_PUBLIC_CMS_AUDIO_DEBUG
): boolean {
  return String(raw ?? '')
    .trim()
    .toLowerCase() === 'true';
}

export const CMS_AUDIO_DEBUG_ENABLED = isCmsAudioDebugEnvEnabled();

export function shouldShowCmsContentAudioDebug(): boolean {
  // Re-check at call time so callers cannot keep a stale true after env is cleared.
  return isCmsAudioDebugEnvEnabled();
}

export type CmsContentAudioDebugPhase =
  | 'idle'
  | 'no_url'
  | 'take_prime'
  | 'settle'
  | 'create'
  | 'attach'
  | 'karaoke_ready'
  | 'lead'
  | 'play'
  | 'playing'
  | 'finished'
  | 'failed'
  | 'cancelled';

export interface CmsContentAudioDebugContext {
  pageId?: string;
  pageType?: string;
  remoteAudioUrl?: string | null;
  playableAudioUrl?: string | null;
  fromPrime?: boolean | null;
  phase?: CmsContentAudioDebugPhase;
  karaokeReady?: boolean;
  isPlaying?: boolean | null;
  isLoaded?: boolean | null;
  positionSec?: number | null;
  durationSec?: number | null;
  didJustFinish?: boolean;
  audioFailedOrSkipped?: boolean;
  waitingOnAudio?: boolean;
  wordsCount?: number;
  leadMs?: number;
  settleMs?: number;
  engine?: 'expo-av';
  lastError?: string | null;
  logLines?: string[];
}

function trunc(value: string | null | undefined, max = 96): string {
  if (!value) return 'n/a';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function buildDebugRows(ctx: CmsContentAudioDebugContext): { label: string; value: string }[] {
  return [
    { label: 'time', value: new Date().toISOString() },
    { label: 'platform', value: `${Platform.OS} ${String(Platform.Version)}` },
    { label: 'app', value: APP_VERSION },
    { label: 'api', value: API_BASE_URL },
    {
      label: 'debugFlag',
      value: CMS_AUDIO_DEBUG_ENABLED ? 'EXPO_PUBLIC_CMS_AUDIO_DEBUG=true' : 'off',
    },
    { label: 'engine', value: ctx.engine ?? 'expo-av' },
    { label: 'pageId', value: ctx.pageId ?? 'n/a' },
    { label: 'pageType', value: ctx.pageType ?? 'content' },
    { label: 'phase', value: ctx.phase ?? 'idle' },
    { label: 'fromPrime', value: ctx.fromPrime == null ? 'n/a' : String(ctx.fromPrime) },
    { label: 'karaokeReady', value: String(Boolean(ctx.karaokeReady)) },
    { label: 'isLoaded', value: ctx.isLoaded == null ? 'n/a' : String(ctx.isLoaded) },
    { label: 'isPlaying', value: ctx.isPlaying == null ? 'n/a' : String(ctx.isPlaying) },
    { label: 'positionSec', value: ctx.positionSec == null ? 'n/a' : ctx.positionSec.toFixed(3) },
    { label: 'durationSec', value: ctx.durationSec == null ? 'n/a' : ctx.durationSec.toFixed(3) },
    { label: 'didJustFinish', value: String(Boolean(ctx.didJustFinish)) },
    { label: 'failedOrSkipped', value: String(Boolean(ctx.audioFailedOrSkipped)) },
    { label: 'waitingOnAudio', value: String(Boolean(ctx.waitingOnAudio)) },
    { label: 'wordsCount', value: String(ctx.wordsCount ?? 0) },
    { label: 'leadMs', value: String(ctx.leadMs ?? 0) },
    { label: 'settleMs', value: String(ctx.settleMs ?? 0) },
    { label: 'remoteAudioUrl', value: trunc(ctx.remoteAudioUrl, 140) },
    { label: 'playableAudioUrl', value: trunc(ctx.playableAudioUrl, 140) },
    { label: 'lastError', value: ctx.lastError ?? 'none' },
    ...(ctx.logLines ?? []).map((line, index) => ({
      label: `log[${index}]`,
      value: line,
    })),
  ];
}

function formatDebugReport(ctx: CmsContentAudioDebugContext): string {
  return ['=== CMS CONTENT AUDIO DEBUG ===', ...buildDebugRows(ctx).map((r) => `${r.label}: ${r.value}`), '=== END ==='].join(
    '\n'
  );
}

export interface CmsContentAudioDebugPanelProps {
  visible: boolean;
  context: CmsContentAudioDebugContext;
}

export function CmsContentAudioDebugPanel({ visible, context }: CmsContentAudioDebugPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const rows = useMemo(() => buildDebugRows(context), [context]);
  const report = useMemo(() => formatDebugReport(context), [context]);
  const envEnabled = shouldShowCmsContentAudioDebug();

  const handleShare = useCallback(async () => {
    try {
      const result = await Share.share({ message: report, title: 'CMS Content Audio Debug' });
      setShareStatus(result.action === Share.sharedAction ? 'Shared' : 'Share cancelled');
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : 'Share failed');
    }
    setTimeout(() => setShareStatus(null), 4000);
  }, [report]);

  // Hard gate: never render when env is missing/false, even if a caller passes visible.
  if (!envEnabled || !visible) return null;

  if (minimized) {
    return (
      <Pressable
        style={styles.minimizedChip}
        onPress={() => setMinimized(false)}
        accessibilityRole="button"
        accessibilityLabel="Expand CMS content audio debug"
      >
        <Text style={styles.minimizedChipText}>
          AUD {context.phase ?? 'idle'} {context.isPlaying ? '▶' : '■'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>CMS Content Audio</Text>
          <Pressable
            onPress={() => setMinimized(true)}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Minimize audio debug"
          >
            <Text style={styles.iconBtnText}>−</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Watch phase / isPlaying on short pages. Share report if audio stays silent.
        </Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} nestedScrollEnabled>
          {rows.map((row, index) => {
            const alert =
              (row.label === 'lastError' && row.value !== 'none') ||
              (row.label === 'phase' && row.value === 'failed') ||
              (row.label === 'isPlaying' && row.value === 'false' && context.phase === 'play');
            return (
              <View key={`${row.label}-${index}`} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={[styles.rowValue, alert && styles.rowValueAlert]} selectable>
                  {row.value}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        {shareStatus ? <Text style={styles.statusText}>{shareStatus}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => void handleShare()} accessibilityRole="button">
            <Text style={styles.actionBtnText}>Share</Text>
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
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    elevation: 900,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 8,
  },
  minimizedChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 900,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  minimizedChipText: {
    fontFamily: Quicksand.bold,
    fontSize: 11,
    color: '#7dd3fc',
  },
  panel: {
    width: '72%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#38bdf8',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: Quicksand.bold,
    fontSize: 14,
    color: '#7dd3fc',
  },
  hint: {
    fontFamily: Quicksand.semiBold,
    fontSize: 10,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  row: {
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.35)',
    paddingBottom: 6,
  },
  rowLabel: {
    fontFamily: Quicksand.bold,
    fontSize: 10,
    color: '#7dd3fc',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowValue: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 14,
    color: '#e2e8f0',
  },
  rowValueAlert: {
    color: '#fca5a5',
  },
  statusText: {
    fontFamily: Quicksand.semiBold,
    fontSize: 11,
    color: '#86efac',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  actionBtnText: {
    fontFamily: Quicksand.bold,
    fontSize: 12,
    color: '#fff',
  },
  actionBtnTextSecondary: {
    fontFamily: Quicksand.bold,
    fontSize: 12,
    color: '#cbd5e1',
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
  iconBtnText: {
    color: '#e2e8f0',
    fontSize: 18,
    lineHeight: 20,
  },
});
