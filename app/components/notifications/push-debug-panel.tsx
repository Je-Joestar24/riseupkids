/**
 * Temporary on-device push debugger.
 * Shown only when EXPO_PUBLIC_PUSH_DEBUG=true. Restart Metro / rebuild APK after toggle.
 */

import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Quicksand } from '@/constants/theme';
import {
  getPushDebugSnapshot,
  isPushDebugEnvEnabled,
  subscribePushDebug,
  type PushDebugSnapshot,
} from '@/utils/notificationPushDebug';

function DebugRow({ label, value }: { label: string; value: string }) {
  const alert =
    label === 'registered' && value === 'false' ||
    label === 'clientKind' && value === 'standalone' ||
    label === 'reason' && value !== 'waiting' && value !== 'none';

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, alert && styles.rowValueAlert]} selectable>
        {value}
      </Text>
    </View>
  );
}

export function PushDebugPanel() {
  const insets = useSafeAreaInsets();
  const [minimized, setMinimized] = useState(false);
  const [snapshot, setSnapshot] = useState<PushDebugSnapshot>(getPushDebugSnapshot);

  useEffect(() => {
    return subscribePushDebug(() => setSnapshot(getPushDebugSnapshot()));
  }, []);

  if (!isPushDebugEnvEnabled()) return null;

  if (minimized) {
    return (
      <Pressable
        style={[styles.chip, { top: insets.top + 8 }]}
        onPress={() => setMinimized(false)}
        accessibilityRole="button"
        accessibilityLabel="Expand push debug panel"
      >
        <Text style={styles.chipText}>Push debug ▼</Text>
      </Pressable>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: 'clientKind', value: snapshot.clientKind },
    { label: 'platform', value: snapshot.platform },
    { label: 'projectId', value: snapshot.projectId },
    { label: 'registered', value: snapshot.registered },
    { label: 'permission', value: snapshot.permission },
    { label: 'tokenPreview', value: snapshot.tokenPreview },
    { label: 'reason', value: snapshot.reason },
    { label: 'api', value: snapshot.api },
    { label: 'app', value: snapshot.appVersion },
    { label: 'time', value: snapshot.time },
  ];

  return (
    <View
      style={[styles.panel, { top: insets.top + 8 }]}
      pointerEvents="box-none"
      accessibilityLabel="Push notification debug"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Push debug</Text>
        <Pressable
          onPress={() => setMinimized(true)}
          accessibilityRole="button"
          accessibilityLabel="Minimize push debug panel"
        >
          <Text style={styles.iconBtnText}>−</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        If clientKind is expo-go on Android, Expo Go cannot receive remote push (SDK 53+). Use a
        development or preview APK. That build must say standalone, registered true, and show a token.
      </Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {rows.map((row) => (
          <DebugRow key={row.label} label={row.label} value={row.value} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    left: 8,
    zIndex: 80,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: Quicksand.bold,
    fontSize: 12,
    color: '#fbbf24',
  },
  panel: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 80,
    maxHeight: 280,
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
    fontSize: 15,
    color: '#fbbf24',
  },
  hint: {
    fontFamily: Quicksand.semiBold,
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 8,
    lineHeight: 15,
  },
  scroll: {
    maxHeight: 180,
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
    color: '#fbbf24',
    textTransform: 'uppercase',
  },
  rowValue: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    color: '#e2e8f0',
  },
  rowValueAlert: {
    color: '#fca5a5',
  },
  iconBtnText: {
    fontFamily: Quicksand.bold,
    fontSize: 22,
    color: '#e2e8f0',
  },
});
