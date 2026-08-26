/**
 * App-wide no-internet modal.
 * Shown on navigation (and whenever an API call fails with a network error).
 * Cannot be dismissed except by restoring connectivity via Try again.
 */

import { usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';

import { ChildNetworkRetry } from '@/components/child/common/child-network-retry';
import { useNetworkStore } from '@/store/networkStore';

export function GlobalNetworkModal() {
  const pathname = usePathname();
  const modalOpen = useNetworkStore((s) => s.modalOpen);
  const checking = useNetworkStore((s) => s.checking);
  const checkOnNavigate = useNetworkStore((s) => s.checkOnNavigate);
  const retry = useNetworkStore((s) => s.retry);

  useEffect(() => {
    void checkOnNavigate();
  }, [pathname, checkOnNavigate]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (useNetworkStore.getState().modalOpen) {
        void useNetworkStore.getState().retry();
        return;
      }
      void useNetworkStore.getState().checkOnNavigate();
    });
    return () => sub.remove();
  }, []);

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
      accessibilityLabel="No internet connection">
      <View style={styles.overlay}>
        <ChildNetworkRetry retrying={checking && modalOpen} onRetry={() => void retry()} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
