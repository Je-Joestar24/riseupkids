/**
 * Child Experience page (iOS tab that takes the place of Kid's Wall).
 * Shows the current episode — see config/experiences.ts. Where the Experience tab is not enabled
 * (Android / Web for now), this route sends the visitor to Home, the same way the wall route does on iOS.
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';

import { ExperienceView } from '@/components/child/experience/experience-view';
import { experienceHomePath, getCurrentExperience, isOwnDomainHttpsUrl } from '@/config/experiences';
import { isExperienceTabEnabled } from '@/utils/experienceTab';

export default function ChildExperienceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const enabled = isExperienceTabEnabled();
  const experience = getCurrentExperience();

  // The tab bar pushes screens on top of each other, so a video started here would keep playing
  // behind Home or Journey. The players are only mounted while this screen is the one in front.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const goHome = useCallback(() => {
    if (id) router.replace(experienceHomePath(id) as never);
  }, [id, router]);

  useEffect(() => {
    if (!enabled) goHome();
  }, [enabled, goHome]);

  // The printable is a file on our own domain, opened in the phone's built-in viewer so the parent
  // can print or share it from there (a WebView cannot print). Anything else is never opened.
  const handlePrint = () => {
    const { link } = experience.printable;
    if (!isOwnDomainHttpsUrl(link)) return;
    WebBrowser.openBrowserAsync(link).catch(() => {});
  };

  if (!enabled) return null;

  return <ExperienceView experience={experience} onPrint={handlePrint} onHome={goHome} active={focused} />;
}
