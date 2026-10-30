/**
 * Experience tab platform gate.
 *
 * The Experience tab takes the place of the Kid's Wall tab wherever Kids Wall is hidden — iOS (App
 * Store build) and the QA preview flag (see kidsWallComingSoon.ts). Android and Web keep Kid's Wall
 * for now; Experience is not shown there yet.
 */

import { Platform } from 'react-native';

import { isKidsWallHidden } from '@/utils/kidsWallComingSoon';

export function isExperienceTabEnabled(platform: typeof Platform.OS = Platform.OS): boolean {
  return isKidsWallHidden(platform);
}
