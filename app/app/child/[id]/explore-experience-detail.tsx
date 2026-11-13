/**
 * Child Experience page (Explore → Experience → one experience)
 * The videos of one published experience in the admin's order, and its printable. Sibling of explore (like
 * the list), named so the footer keeps "Explore" lit (the path contains /explore).
 *
 * The id of the experience arrives as the `uuid` query value, as the other child screens take theirs.
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';

import { ExperienceDetailView } from '@/components/child/experiences/experience-detail-view';
import {
  ExperienceDetailSkeleton,
  ExperienceLoadFailed,
  ExperienceNotFound,
} from '@/components/child/experiences/experience-detail-states';
import { useExperience } from '@/hooks/experienceHook';
import { experienceListRoute, homeRoute } from '@/utils/experienceFormat';
import { isNetworkError } from '@/utils/networkError';

export default function ChildExploreExperienceDetailScreen() {
  const { id, uuid } = useLocalSearchParams<{ id: string; uuid: string }>();
  const router = useRouter();
  // With no child (nothing is drawn) there is no reason to ask the server either.
  const { experience, loading, error, notFound, retry, getImageUrl } = useExperience(id ? uuid : undefined);

  // The tab bar pushes screens on top of each other, so a video started here would keep playing behind
  // Home or Journey. The players are only mounted while this screen is the one in front.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  // The list is the screen below this one, so going back is a plain "back"; opened any other way
  // (nothing below), it goes to the list itself.
  const goToList = useCallback(() => {
    if (!id) return;
    if (router.canGoBack()) router.back();
    else router.replace(experienceListRoute(id) as never);
  }, [id, router]);

  const goHome = useCallback(() => {
    if (id) router.replace(homeRoute(id) as never);
  }, [id, router]);

  // The printable is a file or a link on our own domain, opened in the phone's built-in viewer so the parent
  // can print or share it from there (a WebView cannot print). The address was checked before the button
  // was drawn (utils/experienceFormat printableAction).
  const handlePrint = useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  }, []);

  if (!id || !uuid) return null;

  if (notFound) return <ExperienceNotFound onBack={goToList} onSeeAll={goToList} />;

  if (!experience) {
    // Offline: the global no-internet dialog is in charge, and the page loads again when it reconnects.
    if (loading || (error && isNetworkError(error))) return <ExperienceDetailSkeleton onBack={goToList} />;
    if (error) return <ExperienceLoadFailed onBack={goToList} message={error} onRetry={retry} />;
    return <ExperienceDetailSkeleton onBack={goToList} />;
  }

  return (
    <ExperienceDetailView
      experience={experience}
      getImageUrl={getImageUrl}
      onBack={goToList}
      onHome={goHome}
      onPrint={handlePrint}
      active={focused}
    />
  );
}
