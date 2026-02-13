/**
 * Kid's Wall – Share Something
 * Form: photo, title, description; submit creates post via useKidsWall(childId).createPost.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ShareCta } from '@/components/child/share/share-cta';
import { ShareDescription } from '@/components/child/share/share-description';
import { ShareFooter } from '@/components/child/share/share-footer';
import { ShareHeader } from '@/components/child/share/share-header';
import { SharePhoto } from '@/components/child/share/share-photo';
import { ShareTitle } from '@/components/child/share/share-title';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useKidsWall } from '@/hooks/kidswallHook';
import { useUiStore } from '@/store/uiStore';

export default function WallShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = id ?? null;

  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const wall = useKidsWall(childId ?? undefined);
  const createPost = childId && 'createPost' in wall ? wall.createPost : undefined;
  const loadingMutation = childId && 'loadingMutation' in wall ? wall.loadingMutation : false;
  const showDialog = useUiStore((s) => s.showDialog);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handlePhotoSelect = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto({ uri: result.assets[0].uri });
    }
  }, []);

  const handleSubmit = useCallback(
    async (payload: { photo: { uri: string }; title: string; description: string }) => {
      if (!childId || !createPost) return;
      try {
        await createPost(
          { title: payload.title, content: payload.description },
          {
            uri: payload.photo.uri,
            name: 'image.jpg',
            type: 'image/jpeg',
          }
        );
        showDialog({
          message: 'Your post was sent!',
          subtitle: 'A grown-up will check it soon so everyone can see your amazing work.',
          type: 'success',
          duration: 5000,
          onClose: () => router.back(),
        });
      } catch {
        // Error surfaced by store/hook; keep form open
      }
    },
    [childId, createPost, router, showDialog]
  );

  if (!childId) {
    return null;
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
