import { colors } from '@/config/theme/colors';

import type { StarCamCategoryKey, StarCamCategoryPreset } from './types';

export const STAR_CAM_CATEGORY_PRESETS: Record<StarCamCategoryKey, StarCamCategoryPreset> = {
  reading: {
    key: 'reading',
    gradient: ['#fde8de', '#f5c7b8', colors.orange],
    borderColor: colors.orange,
    overlayTint: '#fde8de',
    decor: [
      { emoji: '📕', style: { top: '38%', left: 20, opacity: 0.3 } },
      { emoji: '📘', style: { top: '50%', right: 30, opacity: 0.3 } },
      { emoji: '⭐', style: { top: '17%', right: 30, opacity: 0.3 } },
    ],
    header: {
      kind: 'text',
      title: '📚 Reading Time',
    },
    footerHint: 'Tap a story to begin reading',
    sampleMissions: [
      { id: 'sample-reading-1', missionId: 'sample-reading-1', title: 'Story one', emoji: '📖' },
      { id: 'sample-reading-2', missionId: 'sample-reading-2', title: 'Story two', emoji: '📚' },
      { id: 'sample-reading-3', missionId: 'sample-reading-3', title: 'Story three', emoji: '🎧' },
    ],
    missionEmojiCycle: ['📖', '📚', '🎧'],
  },
  recipes: {
    key: 'recipes',
    gradient: ['#fff4d6', '#ffd89a', '#f5a623'],
    borderColor: '#e89420',
    overlayTint: '#fff4d6',
    decor: [
      { emoji: '🍎', style: { top: '36%', left: 18, opacity: 0.32 } },
      { emoji: '🥕', style: { top: '52%', right: 26, opacity: 0.3 } },
      { emoji: '👨‍🍳', style: { top: '16%', right: 28, opacity: 0.28 } },
    ],
    header: {
      kind: 'text',
      title: '\n🥣 Yummy Recipes',
    },
    footerHint: 'Tap a recipe to start cooking',
    sampleMissions: [
      { id: 'sample-recipes-1', missionId: 'sample-recipes-1', title: 'Sweet stack', emoji: '🥞' },
      { id: 'sample-recipes-2', missionId: 'sample-recipes-2', title: 'Cookie fun', emoji: '🍪' },
      { id: 'sample-recipes-3', missionId: 'sample-recipes-3', title: 'Fresh bowl', emoji: '🥗' },
    ],
    missionEmojiCycle: ['🥞', '🍪', '🥗'],
  },
  nature: {
    key: 'nature',
    gradient: ['rgb(244, 237, 216)', 'rgb(207, 227, 223)', 'rgb(168, 213, 207)'],
    borderColor: '#2d8a7f',
    overlayTint: '#d4f4e8',
    decor: [
      { emoji: '🍃', style: { top: '40%', left: 16, opacity: 0.35 } },
      { emoji: '🍂', style: { top: '54%', right: 24, opacity: 0.3 } },
      { emoji: '🌿', style: { top: '14%', right: 30, opacity: 0.28 } },
    ],
    header: {
      kind: 'image',
      source: require('@/assets/images/nature_temp.png'),
      accessibilityLabel: 'Pick Your Adventure nature title',
      aspectRatio: 2.55,
      showDecorEmojiStrip: false,
    },
    footerHint: 'Tap a place to explore nature',
    sampleMissions: [
      { id: 'sample-nature-1', missionId: 'sample-nature-1', title: 'Savanna', emoji: '🦁' },
      { id: 'sample-nature-2', missionId: 'sample-nature-2', title: 'Ocean', emoji: '🌊' },
      { id: 'sample-nature-3', missionId: 'sample-nature-3', title: 'Forest', emoji: '🌳' },
    ],
    missionEmojiCycle: ['🦁', '🌊', '🌳'],
  },
  sing: {
    key: 'sing',
    gradient: ['rgb(253, 232, 222)', 'rgb(245, 199, 184)', 'rgb(233, 138, 104)'],
    borderColor: 'rgb(233, 138, 104)',
    overlayTint: '#f3e8ff',
    decor: [
      { emoji: '🎵', style: { top: '38%', left: 20, opacity: 0.3 } },
      { emoji: '🎶', style: { top: '50%', right: 28, opacity: 0.3 } },
      { emoji: '⭐', style: { top: '18%', right: 26, opacity: 0.32 } },
    ],
    header: {
      kind: 'text',
      title: '\n🎵 Sing Along',
    },
    footerHint: 'Tap a song to start singing',
    sampleMissions: [
      { id: 'sample-sing-1', missionId: 'sample-sing-1', title: 'Mic ready', emoji: '🎤' },
      { id: 'sample-sing-2', missionId: 'sample-sing-2', title: 'Guitar groove', emoji: '🎸' },
      { id: 'sample-sing-3', missionId: 'sample-sing-3', title: 'Dance party', emoji: '💃' },
    ],
    missionEmojiCycle: ['🎤', '🎸', '💃'],
  },
  school: {
    key: 'school',
    gradient: ['rgb(253, 232, 222)', 'rgb(245, 199, 184)', 'rgb(233, 138, 104)'],
    borderColor: '#1d4ed8',
    overlayTint: '#e0f2fe',
    decor: [
      { emoji: '📚', style: { top: '37%', left: 18, opacity: 0.3 } },
      { emoji: '✏️', style: { top: '51%', right: 26, opacity: 0.3 } },
      { emoji: '🎒', style: { top: '15%', right: 30, opacity: 0.28 } },
    ],
    header: {
      kind: 'text',
      title: '🎒✏️📐\nSchool Time',
    },
    footerHint: 'Tap a lesson to begin',
    sampleMissions: [
      { id: 'sample-school-1', missionId: 'sample-school-1', title: 'Letters', emoji: '🔤' },
      { id: 'sample-school-2', missionId: 'sample-school-2', title: 'Numbers', emoji: '🔢' },
      { id: 'sample-school-3', missionId: 'sample-school-3', title: 'Shapes', emoji: '🔺' },
    ],
    missionEmojiCycle: ['🔤', '🔢', '🔺'],
  },
};
