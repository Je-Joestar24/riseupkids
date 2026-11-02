/**
 * A remote picture that is cached on the phone (memory and disk), fades in, and loads in the order
 * of its position on the page — see utils/remoteImage.ts. Used for course covers and the
 * video/book/chant/audio thumbnails, which come from a server that can be slow.
 *
 * Until it loads it shows a plain box in the same place, so the layout does not jump.
 */

import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/config/theme/colors';
import { imageLoadPlan } from '@/utils/remoteImage';

const FADE_IN_MS = 150;

export interface RemoteImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  /** Position on the page (0 = first): later pictures load a little later and with lower priority. */
  index?: number;
  accessibilityLabel?: string;
}

export function RemoteImage({ uri, style, contentFit = 'cover', index = 0, accessibilityLabel }: RemoteImageProps) {
  const { delayMs, priority } = imageLoadPlan(index);
  const [started, setStarted] = useState(delayMs === 0);

  useEffect(() => {
    if (started) return undefined;
    const timer = setTimeout(() => setStarted(true), delayMs);
    return () => clearTimeout(timer);
  }, [started, delayMs]);

  if (!started) {
    return <View style={[style as StyleProp<ViewStyle>, styles.placeholder]} />;
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      priority={priority}
      transition={FADE_IN_MS}
      recyclingKey={uri}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.bgTertiary },
});
