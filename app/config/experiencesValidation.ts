/**
 * Store-rule checks for experience entries (config/experiences.ts). Used by the tests only, so none
 * of this ships in the app bundle: they fail the build if an entry links anywhere it should not.
 *
 * App Store / Google Play rules for the Experience page: no social media links and no links to
 * outside websites. Videos must be Bunny embeds; the printable must be on our own domain (which
 * also rules out every social network).
 */

import { isOwnDomainHttpsUrl, type Experience } from '@/config/experiences';
import { BUNNY_IFRAME_HOST, looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

/**
 * Everything wrong with an episode entry, as readable messages (empty = fine). An empty video link
 * is allowed (the page shows a placeholder until the real link is added).
 */
export function findExperienceProblems(experience: Experience): string[] {
  const problems: string[] = [];
  const label = experience.id || experience.title || 'experience';

  if (!experience.title.trim()) problems.push(`${label}: title is empty`);

  for (const [name, value] of [
    ['video1', experience.video1],
    ['video2', experience.video2],
  ] as const) {
    if (!value) continue;
    if (!looksLikeBunnyExploreEmbedUrl(value)) {
      problems.push(`${label}: ${name} is not an https Bunny embed link`);
    } else if (new URL(value).hostname.toLowerCase() !== BUNNY_IFRAME_HOST) {
      // One host everywhere, matching the client's template and the app's other Bunny content.
      problems.push(`${label}: ${name} must use the ${BUNNY_IFRAME_HOST} link`);
    }
  }

  const { link, button } = experience.printable;
  if (!button.trim()) problems.push(`${label}: printable button text is empty`);
  if (link && !isOwnDomainHttpsUrl(link)) {
    problems.push(`${label}: printable link is not an https link on our own domain`);
  }

  return problems;
}
