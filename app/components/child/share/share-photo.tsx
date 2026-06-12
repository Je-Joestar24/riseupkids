/**
 * Share Something Photo (App)
 * "Add a Photo!" – tap to pick image; shows preview + "Change Photo" when selected.
 * Matches web ShareSomethingPhoto; parent provides onPhotoSelect and selectedPhoto (uri).
 */

import { View, StyleSheet, Pressable, Image, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CAMERA_ICON = require('@/assets/images/camera.png');

export interface SharePhotoAsset {
  uri: string;
  name?: string;
  type?: string;
}

export interface SharePhotoProps {
  selectedPhoto: SharePhotoAsset | null;
  onPhotoSelect: () => void;
}

/** Portrait aspect: width : height = 3 : 4 (a little taller than wide, not too tall) */
const PORTRAIT_ASPECT = 6 / 5;

export function SharePhoto({ selectedPhoto, onPhotoSelect }: SharePhotoProps) {
  const { width } = useWindowDimensions();
  const areaWidth = Math.min(width - spacing[4] * 2 - spacing[6] * 2, 320);
  const areaHeight = Math.round(areaWidth * PORTRAIT_ASPECT);

  return (
    <View style={styles.wrapper}>
      <View style={styles.headRow}>
        <Image
          source={CAMERA_ICON}
          style={styles.cameraIcon}
          resizeMode="contain"
          accessibilityLabel="Camera"
        />
        <ThemedText style={styles.heading}>Add a Photo!</ThemedText>
      </View>
      <Pressable
        onPress={onPhotoSelect}
        style={({ pressed }) => [
          styles.uploadArea,
          { width: areaWidth, height: areaHeight },
          selectedPhoto && styles.uploadAreaFilled,
          pressed && styles.uploadAreaPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={selectedPhoto ? 'Change photo' : 'Tap to add a photo'}>
        {selectedPhoto ? (
          <>
            <Image
              source={{ uri: selectedPhoto.uri }}
              style={[StyleSheet.absoluteFill, { width: areaWidth, height: areaHeight }]}
              resizeMode="cover"
              accessibilityLabel="Selected photo"
            />
            <Pressable
              style={styles.changeBtn}
              onPress={(e) => {
                e.stopPropagation();
                onPhotoSelect();
              }}
              accessibilityRole="button"
              accessibilityLabel="Change photo">
              <ThemedText style={styles.changeBtnText}>✕ Change Photo</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="camera" size={64} color={colors.secondary} />
            <ThemedText style={styles.uploadTitle}>Tap to Add a Photo!</ThemedText>
            <ThemedText style={styles.uploadSubtitle}>Ask a grown-up to help!</ThemedText>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    padding: spacing[3],
    borderWidth: 4,
    borderColor: colors.secondary,
    borderRadius: 0,
    backgroundColor: colors.bgCard,
    marginBottom: spacing[8],
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  cameraIcon: {
    width: 80,
    height: 80,
  },
  heading: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['2xl'],
    color: colors.secondary,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
  },
  uploadArea: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: colors.secondary,
    borderRadius: 0,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  uploadAreaFilled: {
    borderStyle: 'solid',
    borderColor: colors.accent,
  },
  uploadAreaPressed: {
    opacity: 0.9,
  },
  uploadTitle: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes['2xl'],
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.normal,
  },
  uploadSubtitle: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  changeBtn: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.textInverse,
    borderRadius: 0,
    zIndex: 1,
  },
  changeBtnText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.lg,
    color: colors.orange,
  },
});
