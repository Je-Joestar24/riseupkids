/**
 * Experience episodes shown on the "Experience" tab (iOS, where Kids Wall is hidden).
 *
 * One entry per episode — to add a new one, add an entry to EXPERIENCES. The tab shows the current
 * episode (the first entry) on a page with the same layout every time: title, Video 1 (vocabulary,
 * verbs and pronunciation), Video 2 (the story), a printable, and a closing message with a button
 * back to the app home.
 *
 * App Store / Google Play rules: no social media links and no links to outside websites on this
 * page. Video links must be Bunny embeds and the printable must be hosted on our own domain;
 * `findExperienceProblems` (config/experiencesValidation.ts, run by the tests) rejects anything else.
 */

import type { ImageSourcePropType } from 'react-native';

import { BUNNY_IFRAME_HOST, looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

export interface ExperiencePrintable {
  /** Preview picture shown above the print button. */
  image: ImageSourcePropType | null;
  /** The file to print (hosted on our own domain). Empty hides the print action's target. */
  link: string;
  /** Text on the print button. */
  button: string;
}

export interface Experience {
  id: string;
  title: string;
  /** Video 1: vocabulary, verbs and pronunciation. Bunny embed URL; empty shows a placeholder. */
  video1: string;
  /** Video 2: the story (the full episode). Bunny embed URL; empty shows a placeholder. */
  video2: string;
  printable: ExperiencePrintable;
}

/**
 * Bunny links come in two forms, `player.mediadelivery.net/embed/...` and
 * `iframe.mediadelivery.net/embed/...`. Both serve the same videos; this page always uses the iframe
 * host, which is the one the client's template and the rest of the app's Bunny content use, so every
 * link is written the same way.
 */
export function toBunnyIframeHost(link: string): string {
  return link.replace(/^https:\/\/player\.mediadelivery\.net\//i, `https://${BUNNY_IFRAME_HOST}/`);
}

/**
 * A video link from the app settings on the iframe host, or '' when it is missing or is not a Bunny
 * embed link — so nothing else is ever loaded (the episode then keeps its built-in link).
 */
export function bunnyLinkFromEnv(value: string | undefined): string {
  const link = value?.trim() ?? '';
  return looksLikeBunnyExploreEmbedUrl(link) ? toBunnyIframeHost(link) : '';
}

// For now: the same two Bunny videos the production website's Experience page uses (the backend's
// EXPERIENCE_VIDEOS_PT), in the same order. Replace them when the client sends the final links, or
// override them while testing with EXPO_PUBLIC_EXPERIENCE_SMOOTHIE_VIDEO1 / _VIDEO2 (see .env.example).
const SMOOTHIE_VIDEO1 = 'https://iframe.mediadelivery.net/embed/660084/fbf9d1d1-5294-4375-8abf-a1529c31c496';
const SMOOTHIE_VIDEO2 = 'https://iframe.mediadelivery.net/embed/660084/ea5f0749-8fde-43e5-851b-ec9e5af9e12a';

export const EXPERIENCES: Experience[] = [
  {
    id: 'strawberry-banana-smoothie',
    title: 'Strawberry Banana Smoothie',
    // The settings must be written out in full here: Expo only fills in settings it can see.
    video1: bunnyLinkFromEnv(process.env.EXPO_PUBLIC_EXPERIENCE_SMOOTHIE_VIDEO1) || SMOOTHIE_VIDEO1,
    video2: bunnyLinkFromEnv(process.env.EXPO_PUBLIC_EXPERIENCE_SMOOTHIE_VIDEO2) || SMOOTHIE_VIDEO2,
    printable: {
      image: require('@/assets/images/experience/strawberry-banana-smoothie-printable.jpg'),
      link: 'https://riseup.kids/downloads/strawberry-banana-smoothie-recipe.pdf',
      button: 'Print recipe here',
    },
  },
];

export function getCurrentExperience(): Experience {
  return EXPERIENCES[0];
}

/** Fixed wording of the page (the same for every episode). */
export const EXPERIENCE_COPY = {
  taglineLine1: 'Your child will be bilingual, naturally.',
  taglineLine2: 'How? By living the English language.',
  video1Label: 'Vocabulary, verbs and pronunciation',
  video2Label: 'The story',
  printablePlaceholder: 'Printable',
  printablePlaceholderHint: 'Picture goes here',
  closingTitle: 'You are learning, one step at a time.',
  closingStars: 'Reach for the stars',
  homeButton: 'Back to home',
  footer: '© Rise Up Kids',
} as const;

/** Hosts the printable may be served from: our own domain only. */
const OWN_DOMAIN_HOSTS = ['riseup.kids', 'www.riseup.kids', 'app.riseup.kids'];

/**
 * True only for an https link on our own domain. The Print button opens nothing else (store rules:
 * no outside links), and the tests use the same check on every episode's printable.
 */
export function isOwnDomainHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && OWN_DOMAIN_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Where the "Back to home" button goes: the child's home screen inside the app. */
export function experienceHomePath(childId: string): string {
  return `/child/${childId}/home`;
}
