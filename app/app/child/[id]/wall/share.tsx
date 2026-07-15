/**
 * Kid's Wall – Share Something
 * Form: photo, title, description; submit creates post via useKidsWall(childId).createPost.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ShareCta, type ShareCtaSubmitPayload } from '@/components/child/share/share-cta';
import type { SharePhotoAsset } from '@/components/child/share/share-photo';
import { ShareDescription } from '@/components/child/share/share-description';
import { ShareFooter } from '@/components/child/share/share-footer';
import { ShareHeader } from '@/components/child/share/share-header';
import { SharePhoto } from '@/components/child/share/share-photo';
import { ShareTitle } from '@/components/child/share/share-title';
import { colors } from '@/config/theme/colors';
import { KIDS_WALL_UPLOAD_DISABLED_MESSAGE } from '@/constants/kidsWallConsent';
import { spacing } from '@/config/theme/spacing';
import { useChildProfile } from '@/hooks/childProfileHook';
import { useKidsWall } from '@/hooks/kidswallHook';
import { useUiStore } from '@/store/uiStore';

export default function WallShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = id ?? null;
  const { kidsWallEnabled, loading: profileLoading } = useChildProfile(childId);

  const [photo, setPhoto] = useState<SharePhotoAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const wall = useKidsWall(childId ?? undefined);
  const createPost = childId && 'createPost' in wall ? wall.createPost : undefined;
  const loadingMutation = childId && 'loadingMutation' in wall ? wall.loadingMutation : false;
  const showDialog = useUiStore((s) => s.showDialog);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (profileLoading || kidsWallEnabled || !childId) return;
    showDialog({
      message: KIDS_WALL_UPLOAD_DISABLED_MESSAGE,
      type: 'info',
      duration: 5000,
      onClose: () => router.replace(`/child/${childId}/wall` as never),
    });
  }, [profileLoading, kidsWallEnabled, childId, showDialog, router]);

  const handlePhotoSelect = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({
        message: 'We need photo access to add your picture.',
        subtitle: 'Ask a grown-up to allow photos in your device Settings.',
        type: 'error',
        duration: 5000,
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        name: asset.fileName ?? `kids-wall-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  }, [showDialog]);

  const handleSubmit = useCallback(
    async (payload: ShareCtaSubmitPayload) => {
      if (!childId || !createPost) return;
      try {
        await createPost(
          { title: payload.title, content: payload.description },
          {
            uri: payload.photo.uri,
            name: payload.photo.name ?? 'image.jpg',
            type: payload.photo.type ?? 'image/jpeg',
          }
        );
        showDialog({
          message: 'Your post was sent!',
          subtitle: 'A grown-up will check it soon so everyone can see your amazing work.',
          type: 'success',
          duration: 5000,
          onClose: () => router.back(),
        });
      } catch (e) {
        showDialog({
          message: (e as Error)?.message ?? 'Failed to share your work. Please try again.',
          type: 'error',
          duration: 5000,
        });
      }
    },
    [childId, createPost, router, showDialog]
  );

  if (!childId) {
    return null;
  }

  if (profileLoading || !kidsWallEnabled) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ShareHeader onBack={handleBack} />
        <SharePhoto selectedPhoto={photo} onPhotoSelect={handlePhotoSelect} />
        <ShareTitle title={title} onTitleChange={setTitle} maxLength={50} />
        <ShareDescription
          description={description}
          onDescriptionChange={setDescription}
          maxLength={150}
        />
        <ShareCta
          photo={photo}
          title={title}
          description={description}
          onSubmit={handleSubmit}
          loading={loadingMutation}
        />
        <ShareFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EDD8',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
  },
});
