/**
 * Kids Wall Coming Soon — full-bleed Games artwork for iOS (and preview).
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const GAMES_COMING_SOON = require('@/assets/images/games.png');

export function WallComingSoon() {
  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel="Games coming soon">
      <Image
        source={GAMES_COMING_SOON}
        style={styles.image}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E6E3',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
