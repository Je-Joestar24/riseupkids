import { StyleSheet, Text, type TextProps } from 'react-native';

import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const baseColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const color = type === 'link' && !lightColor && !darkColor ? colors.textTeal : baseColor;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Quicksand.regular,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Quicksand.semiBold,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Quicksand.bold,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: Quicksand.semiBold,
  },
  link: {
    lineHeight: 24,
    fontSize: 16,
    fontFamily: Quicksand.semiBold,
  },
});
