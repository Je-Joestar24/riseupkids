import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, an uncaught error anywhere in the tree is a plain black screen in a release
 * build (TestFlight/production) — React Native's dev-only red error screen doesn't exist there,
 * and this app has no crash-reporting service wired up yet. This turns that into a visible
 * fallback showing the actual error, so a report at least comes with the real cause instead of
 * "the app went black."
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <ThemedText type="title" style={styles.title}>
              Something went wrong
            </ThemedText>
            <ThemedText style={styles.message}>
              {error.message || 'An unexpected error occurred.'}
            </ThemedText>
            <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button">
              <ThemedText style={styles.buttonText}>Try again</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLogin,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 384,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    alignItems: 'center',
  },
  title: {
    color: colors.error,
    fontSize: typography.sizes.xl,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  button: {
    backgroundColor: colors.btnTeal,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radii.md,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
