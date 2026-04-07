import { StyleSheet } from 'react-native';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export const mapStyles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 8,
    overflow: 'hidden',
    backgroundColor: colors.bgLogin,
    position: 'relative',
  },
  screenGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorEmoji: {
    position: 'absolute',
    lineHeight: 72,
  },
  decorEmojiText: {
    fontSize: 56,
    fontWeight: '600',
    lineHeight: 72,
  },
  backBtn: {
    position: 'absolute',
    left: spacing[4],
    top: spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mainColumn: {
    flex: 1,
    zIndex: 10,
    flexDirection: 'column',
    alignSelf: 'stretch',
    minHeight: 0,
  },
  titleBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
  },
  headerTextBlock: {
    alignItems: 'center',
  },
  headerTitleImageWrap: {
    alignItems: 'center',
    width: '100%',
  },
  headerImageEmojiRow: {
    marginBottom: spacing[1],
    lineHeight: 72,
  },
  headerImageEmojiStrip: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textInverse,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    lineHeight: 72,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.textInverse,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  missionAnchor: {
    position: 'absolute',
    zIndex: 20,
  },
  missionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionPressed: {
    opacity: 0.92,
  },
  missionBubbleOuter: {
    padding: 8,
    backgroundColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 12,
  },
  missionEmoji: {
    fontWeight: '700',
    lineHeight: 72,
  },
  missionFallbackLetter: {
    fontWeight: '800',
    color: colors.textInverse,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  footerBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[3],
  },
  footerHint: {
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: spacing[4],
  },
});
