/**
 * Share Something Header (App)
 * Back button, "Share Your Amazing Work!" with star icon, subtitle.
 * Matches web ShareSomethingHeader; back goes to Kid's Wall.
 */

import { View, StyleSheet, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface ShareHeaderProps {
    onBack: () => void;
}

export function ShareHeader({ onBack }: ShareHeaderProps) {
    return (
        <View style={styles.wrapper}>
            <Pressable
                onPress={onBack}
                style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Back to Show & Tell">
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.secondary} />
                <ThemedText style={styles.backBtnText}>Back to Show & Tell</ThemedText>
            </Pressable>
            <View style={styles.titleRow}>
                <ThemedText style={styles.title}>Share Your Amazing Work!
                    <MaterialCommunityIcons name="star-four-points-outline" size={40} color={colors.accent} /></ThemedText>
            </View>
            <ThemedText style={styles.subtitle}>
                Show everyone what you learned!
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        padding: spacing[6],
        borderRadius: 0,
        borderWidth: 4,
        borderColor: colors.orange,
        backgroundColor: colors.bgCard,
        gap: spacing[2],
        marginBottom: spacing[8],
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        alignSelf: 'flex-start',
    },
    backBtnPressed: {
        opacity: 0.8,
    },
    backBtnText: {
        fontFamily: 'Quicksand_600SemiBold',
        fontSize: typography.sizes.lg,
        color: colors.secondary,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
    },
    title: {
        fontFamily: 'Quicksand_700Bold',
        fontSize: typography.sizes['3xl'],
        color: colors.secondary,
        textAlign: 'center',
        lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
    },
    subtitle: {
        fontFamily: 'Quicksand_600SemiBold',
        fontSize: typography.sizes.xl,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: typography.sizes.xl * typography.lineHeights.normal,
    },
});
