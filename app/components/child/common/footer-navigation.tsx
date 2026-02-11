/**
 * Child Footer Navigation
 * Fixed bottom nav: Home, My Journey, Explore, Kid's Wall
 * Follows web ChildNavigation design - scale on press, per-tab active colors
 */

import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const ICON_SIZE = 32;
const CONTAINER_PADDING = 8;

const CHILD_ICON = require('@/assets/images/child.png');
const CHILD_DARK_ICON = require('@/assets/images/child_dark.png');

const ACTIVE_COLORS = {
    home: colors.secondary,
    journey: colors.orange,
    explore: colors.accent,
    wall: 'rgb(212, 230, 227)',
} as const;

const INACTIVE_COLOR = 'rgba(123, 130, 149, 0.9)';

interface FooterNavigationProps {
    childId: string;
}

type NavValue = 'home' | 'journey' | 'explore' | 'wall';

const NAV_ITEMS: { value: NavValue; label: string; isImage: boolean }[] = [
    { value: 'home', label: 'Home', isImage: false },
    { value: 'journey', label: 'My Journey', isImage: true },
    { value: 'explore', label: 'Explore', isImage: false },
    { value: 'wall', label: "Kid's Wall", isImage: false },
];

function getActiveFromPath(pathname: string): NavValue {
    // Module is a sibling route; when on module, keep "My Journey" active in footer
    if (pathname.includes('/module') || pathname.includes('/journey')) return 'journey';
    // Replays and explore-content are sibling routes for Explore; keep "Explore" active in footer
    if (
      pathname.includes('/replays') ||
      pathname.includes('/explore') ||
      pathname.includes('explore-content')
    )
      return 'explore';
    if (pathname.includes('/wall')) return 'wall';
    return 'home';
}

export function FooterNavigation({ childId }: FooterNavigationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const activeValue = getActiveFromPath(pathname);

    const handleNav = (value: NavValue) => {
        router.push(`/child/${childId}/${value}` as never);
    };

    const renderIcon = (item: (typeof NAV_ITEMS)[0], isActive: boolean) => {
        const iconColor = isActive
            ? item.value === 'wall'
                ? colors.secondary
                : colors.textInverse
            : INACTIVE_COLOR;

        if (item.isImage) {
            return (
                <Image
                    source={isActive ? CHILD_ICON : CHILD_DARK_ICON}
                    style={styles.navImage}
                    resizeMode="contain"
                />
            );
        }

        switch (item.value) {
            case 'home':
                return (
                    <MaterialCommunityIcons name="home-outline" size={ICON_SIZE} color={iconColor} />
                );
            case 'explore':
                return (
                    <MaterialCommunityIcons name="earth" size={ICON_SIZE} color={iconColor} />
                );
            case 'wall':
                return (
                    <MaterialCommunityIcons
                        name="star-four-points-outline"
                        size={ICON_SIZE}
                        color={iconColor}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <View style={styles.inner}>
                {NAV_ITEMS.map((item) => {
                    const isActive = activeValue === item.value;

                    return (
                        <NavButton
                            key={item.value}
                            label={item.label}
                            isActive={isActive}
                            activeColor={ACTIVE_COLORS[item.value]}
                            iconColor={
                                isActive
                                    ? item.value === 'wall'
                                        ? colors.secondary
                                        : colors.textInverse
                                    : INACTIVE_COLOR
                            }
                            onPress={() => handleNav(item.value)}>
                            {renderIcon(item, isActive)}
                        </NavButton>
                    );
                })}
            </View>
        </View>
    );
}

interface NavButtonProps {
    label: string;
    isActive: boolean;
    activeColor: string;
    iconColor: string;
    onPress: () => void;
    children: React.ReactNode;
}

function NavButton({ label, isActive, activeColor, iconColor, onPress, children }: NavButtonProps) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 1.08,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.button,
            {
                backgroundColor: isActive ? activeColor : 'transparent',
                transform: [{ scale: 1 }],
            },]}
            accessibilityRole="button"
            accessibilityLabel={label}>
            <Animated.View
                style={[
                    styles.buttonContent,
                ]}>
                <View style={styles.iconWrap}>{children}</View>
                <ThemedText
                    style={[
                        styles.label,
                        { color: iconColor },
                        isActive && styles.labelBold,
                    ]}>
                    {label}
                </ThemedText>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgCard,
        paddingHorizontal: CONTAINER_PADDING,
        paddingVertical: CONTAINER_PADDING,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    button: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
    },
    buttonContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[1],
        borderRadius: 0,
    },
    iconWrap: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    navImage: {
        width: ICON_SIZE,
        height: ICON_SIZE,
    },
    label: {
        fontSize: typography.sizes.sm,
        fontFamily: 'Quicksand_500Medium',
    },
    labelBold: {
        fontFamily: 'Quicksand_700Bold',
    },
});
