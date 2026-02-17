/**
 * HTML5 content modal for child app.
 * Opens in portrait (like video); fullscreen = landscape with 4/6 width content, white background.
 * Title, countdown, Done and minimize are fixed at screen corners (outside the content box).
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { StatusBar } from 'react-native';

import { setImmersiveFullscreen } from '@/utils/androidNavigationBar';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { moduleService } from '@/services/moduleService';
import { useUiStore } from '@/store/uiStore';

const COUNTDOWN_SECONDS = 60;
/** Pass threshold: score / maxScore >= 75% */
const PASS_THRESHOLD = 75;
const OVERLAY_BG = 'rgba(0,0,0,0.55)';
/** Backdrop behind the portrait card (reduce opacity for a lighter dim). Same as video modal: 0.5 = 50%. */
const BACKDROP_BG = 'rgba(0,0,0,0.5)';
const PORTRAIT_CARD_MAX_WIDTH = 480;
/** Fullscreen content width ratio (4/6 of screen width). */
const FULLSCREEN_CONTENT_WIDTH_RATIO = 4 / 6;

/** Injected script to read Captivate quiz score/max and post to RN (debug / future submit). */
const GET_QUIZ_SCORE_SCRIPT = `
(function() {
  var score = null, maxScore = null, pass = null;
  try {
    if (window.cpAPIInterface) {
      var s = window.cpAPIInterface.getVariableValue("cpQuizInfoPointsscored");
      var m = window.cpAPIInterface.getVariableValue("cpQuizInfoTotalQuizPoints");
      var p = window.cpAPIInterface.getVariableValue("cpQuizInfoPassFail");
      if (s !== undefined && s !== null && s !== "") score = Number(s);
      if (m !== undefined && m !== null && m !== "") maxScore = Number(m);
      if (p !== undefined && p !== null && p !== "") pass = String(p).toLowerCase().indexOf("pass") !== -1;
    }
  } catch (e) {}
  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "HTML5_QUIZ_RESULT",
      score: score,
      maxScore: maxScore,
      pass: pass
    }));
  }
})();
true;
`;

/** Book completion API response (reading count, stars). */
export interface BookCompletionData {
    readingCount: number;
    requiredReadingCount: number;
    starsAwarded: boolean;
    starsToAward: number;
    requirementMet?: boolean;
    alreadyCompleted?: boolean;
}

export interface Html5Result {
    score: number | null;
    maxScore: number | null;
    passed: boolean | null;
    progress: number | null;
    bookReading?: BookCompletionData | null;
}

export interface Html5ModalProps {
    open: boolean;
    onClose: () => void;
    launchUrl: string | null;
    title?: string | null;
    loading?: boolean;
    error?: string | null;
    courseId?: string | null;
    childId?: string | null;
    bookId?: string | null;
    onAfterComplete?: () => void;
}

function computePassAndProgress(score: number | null, maxScore: number | null): { passed: boolean; progress: number } {
    if (maxScore == null || maxScore <= 0 || score == null) {
        return { passed: false, progress: 0 };
    }
    const percentage = (score / maxScore) * 100;
    const passed = percentage >= PASS_THRESHOLD;
    const progress = passed ? 100 : Math.round(percentage);
    return { passed, progress };
}

export function Html5Modal({
    open,
    onClose,
    launchUrl,
    title,
    loading: externalLoading,
    error,
    courseId,
    childId,
    bookId,
    onAfterComplete,
}: Html5ModalProps) {
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [result, setResult] = useState<Html5Result | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const webViewRef = useRef<WebView>(null);
    const scoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showDialog = useUiStore((s) => s.showDialog);

    const canClose = countdown <= 0;
    const showCountdown = open && launchUrl && !error && (externalLoading === false);
    const isCounting = showCountdown && !canClose;

    const startCountdown = useCallback(() => {
        if (intervalRef.current) return;
        setCountdown(COUNTDOWN_SECONDS);
        intervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => {
        if (!open) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setCountdown(COUNTDOWN_SECONDS);
            return;
        }
        if (launchUrl && !externalLoading && !error) {
            startCountdown();
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [open, launchUrl, externalLoading, error, startCountdown]);

    const handleWebViewMessage = useCallback(
        (event: { nativeEvent: { data: string } }) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data?.type === 'HTML5_QUIZ_RESULT') {
                    if (scoreTimeoutRef.current) {
                        clearTimeout(scoreTimeoutRef.current);
                        scoreTimeoutRef.current = null;
                    }
                    const score = typeof data.score === 'number' ? data.score : null;
                    const maxScore = typeof data.maxScore === 'number' ? data.maxScore : null;
                    const { passed, progress } = computePassAndProgress(score, maxScore);
                    const next: Html5Result = { score, maxScore, passed, progress };
                    setResult(next);

                    if (passed && courseId && childId && bookId) {
                        const numScore = score ?? 0;
                        const numMax = maxScore ?? 0;
                        moduleService
                            .submitBookCompletion(courseId, childId, bookId, {
                                score: numScore,
                                maxScore: numMax,
                                status: 'passed',
                                timeSpent: 0,
                                progress,
                            })
                            .then((res) => {
                                const payload = res?.data as { data?: BookCompletionData } | undefined;
                                const bookReading = payload?.data ?? null;
                                setResult((prev) => (prev ? { ...prev, bookReading } : null));
                                onAfterComplete?.();
                            })
                            .catch(() => {});
                    }
                }
            } catch {
                // ignore
            }
        },
        [courseId, childId, bookId, onAfterComplete]
    );

    const handleDone = useCallback(() => {
        if (!canClose) return;
        setResult(null);
        try {
            webViewRef.current?.injectJavaScript(GET_QUIZ_SCORE_SCRIPT);
        } catch {
            setResult({ score: null, maxScore: null, passed: null, progress: null });
        }
        scoreTimeoutRef.current = setTimeout(() => {
            scoreTimeoutRef.current = null;
            setResult((prev) =>
                prev === null ? { score: null, maxScore: null, passed: null, progress: null } : prev
            );
        }, 1800);
    }, [canClose]);

    const PORTRAIT = ScreenOrientation.OrientationLock.PORTRAIT_UP;
    const LANDSCAPE = ScreenOrientation.OrientationLock.LANDSCAPE;

    const enterFullscreen = useCallback(async () => {
        try {
            await ScreenOrientation.lockAsync(LANDSCAPE);
            setIsFullscreen(true);
            StatusBar.setHidden(true, 'slide');
            if (Platform.OS === 'android') {
                setImmersiveFullscreen(true);
            }
        } catch {
            // ignore
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        try {
            await ScreenOrientation.lockAsync(PORTRAIT);
            setIsFullscreen(false);
            StatusBar.setHidden(false, 'slide');
            if (Platform.OS === 'android') {
                setImmersiveFullscreen(false);
            }
        } catch {
            // ignore
        }
    }, []);

    const clearResultAndClose = useCallback(() => {
        if (scoreTimeoutRef.current) {
            clearTimeout(scoreTimeoutRef.current);
            scoreTimeoutRef.current = null;
        }
        setResult(null);
        if (isFullscreen) {
            exitFullscreen();
        }
        onClose();
    }, [isFullscreen, onClose, exitFullscreen]);

    /** Close only the completion dialog so the child can continue the activity (stay in HTML5). */
    const closeCompletionDialogOnly = useCallback(() => {
        if (scoreTimeoutRef.current) {
            clearTimeout(scoreTimeoutRef.current);
            scoreTimeoutRef.current = null;
        }
        setResult(null);
    }, []);

    /** When passed: show global dialog (star / more readings message) then close modal. */
    const handleContinueAfterPass = useCallback(
        (res: Html5Result) => {
            if (res?.bookReading) {
                const br = res.bookReading;
                if (br.starsToAward > 0) {
                    showDialog({
                        message: `You just gained ${br.starsToAward} star${br.starsToAward !== 1 ? 's' : ''}!`,
                        type: 'success',
                    });
                } else if (br.requirementMet || br.alreadyCompleted) {
                    showDialog({ message: 'You already gained the star!', type: 'success' });
                } else {
                    const more = Math.max(0, (br.requiredReadingCount ?? 5) - br.readingCount);
                    showDialog({
                        message: more === 1 ? 'Do 1 more reading to earn your star!' : `Do ${more} more readings to earn your star!`,
                        type: 'info',
                    });
                }
            } else {
                showDialog({ message: 'Great job finishing the book!', type: 'success' });
            }
            clearResultAndClose();
        },
        [showDialog, clearResultAndClose]
    );

    const handleReload = useCallback(() => {
        if (scoreTimeoutRef.current) {
            clearTimeout(scoreTimeoutRef.current);
            scoreTimeoutRef.current = null;
        }
        setResult(null);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setCountdown(COUNTDOWN_SECONDS);
        startCountdown();
        try {
            webViewRef.current?.reload();
        } catch {
            // ignore
        }
    }, [startCountdown]);

    // When modal opens, start in portrait; when it closes, restore portrait and system UI
    useEffect(() => {
        exitFullscreen();
    }, [open, exitFullscreen]);

    if (!open) return null;

    const renderDoneRow = (isOverlay?: boolean) => (
        <>
            {isCounting ? (
                <ThemedText
                    style={isOverlay ? styles.countdownTextOverlay : styles.countdownText}
                    accessibilityLabel={`Done button available in ${countdown} seconds`}
                >
                    Done in {countdown}s
                </ThemedText>
            ) : null}
            <Pressable
                onPress={handleDone}
                disabled={!canClose}
                style={({ pressed }) => [
                    styles.doneButton,
                    (!canClose || pressed) && styles.doneButtonDisabled,
                    canClose && pressed && styles.doneButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={canClose ? 'Done' : `Done available in ${countdown} seconds`}
                accessibilityState={{ disabled: !canClose }}
            >
                <ThemedText
                    style={[styles.doneButtonText, !canClose && styles.doneButtonTextDisabled]}
                >
                    Done
                </ThemedText>
            </Pressable>
        </>
    );

    return (
        <Modal
            visible={open}
            animationType="slide"
            transparent
            onRequestClose={canClose ? onClose : undefined}
            accessibilityLabel="HTML5 content"
            statusBarTranslucent={isFullscreen}
        >
            <View
                style={[
                    styles.container,
                    isFullscreen && styles.containerFullscreen,
                    !isFullscreen && launchUrl && !error && styles.containerPortrait,
                ]}>
                {externalLoading && !launchUrl && (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.secondary} />
                        <ThemedText style={styles.loadingText}>Loading…</ThemedText>
                    </View>
                )}

                {error && (
                    <View style={styles.centered}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
                        <ThemedText style={styles.errorText}>{error}</ThemedText>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <ThemedText style={styles.doneButtonText}>Close</ThemedText>
                        </Pressable>
                    </View>
                )}

                {launchUrl && !error && (
                    <>
                        {isFullscreen ? (
                            <View style={styles.fullscreenWrap}>
                                <View
                                    style={[
                                        styles.fullscreenContentBox,
                                        { width: Dimensions.get('window').width * FULLSCREEN_CONTENT_WIDTH_RATIO },
                                    ]}>
                                    <WebView
                                        ref={webViewRef}
                                        source={{ uri: launchUrl }}
                                        style={styles.fullscreenWebView}
                                        onLoadEnd={() => { }}
                                        onMessage={handleWebViewMessage}
                                        originWhitelist={['*']}
                                        accessibilityLabel="HTML5 content"
                                        scalesPageToFit={false}
                                        bounces={false}
                                    />
                                </View>
                                <View style={styles.cornerTopLeft} pointerEvents="box-none">
                                    <ThemedText style={styles.cornerTitle} numberOfLines={2}>
                                        {title ?? 'Content'}
                                    </ThemedText>
                                </View>
                                <Pressable
                                    onPress={exitFullscreen}
                                    style={styles.cornerTopRight}
                                    accessibilityRole="button"
                                    accessibilityLabel="Exit fullscreen"
                                >
                                    <MaterialCommunityIcons
                                        name="fullscreen-exit"
                                        size={28}
                                        color={colors.primary}
                                    />
                                </Pressable>
                                <View style={styles.cornerBottomLeft} pointerEvents="box-none">
                                    {isCounting ? (
                                        <ThemedText
                                            style={styles.cornerCountdown}
                                            accessibilityLabel={`Done available in ${countdown} seconds`}
                                        >
                                            Done in {countdown}s
                                        </ThemedText>
                                    ) : null}
                                </View>
                                <Pressable
                                    onPress={handleDone}
                                    disabled={!canClose}
                                    style={({ pressed }) => [
                                        styles.cornerBottomRight,
                                        !canClose && styles.doneButtonDisabled,
                                        canClose && pressed && styles.doneButtonPressed,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={canClose ? 'Done' : `Done available in ${countdown} seconds`}
                                    accessibilityState={{ disabled: !canClose }}
                                >
                                    <ThemedText
                                        style={[styles.doneButtonText, !canClose && styles.doneButtonTextDisabled]}
                                    >
                                        Done
                                    </ThemedText>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.portraitCard}>
                                <View style={styles.header}>
                                    <ThemedText style={styles.title} numberOfLines={1}>
                                        {title ?? 'Content'}
                                    </ThemedText>
                                    <Pressable
                                        onPress={enterFullscreen}
                                        style={styles.fullscreenBtn}
                                        accessibilityRole="button"
                                        accessibilityLabel="Fullscreen (rotate)"
                                    >
                                        <MaterialCommunityIcons
                                            name="fullscreen"
                                            size={24}
                                            color={colors.secondary}
                                        />
                                    </Pressable>
                                </View>
                                <View style={styles.webViewWrap}>
                                    <WebView
                                        ref={webViewRef}
                                        source={{ uri: launchUrl }}
                                        style={styles.webView}
                                        onLoadEnd={() => { }}
                                        onMessage={handleWebViewMessage}
                                        originWhitelist={['*']}
                                        accessibilityLabel="HTML5 content"
                                        scalesPageToFit={false}
                                        bounces={false}
                                    />
                                </View>
                                <View style={styles.footer}>
                                    {renderDoneRow(false)}
                                </View>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Completion dialog: one dialog only; Continue closes dialog only (stay in activity); Retry restarts HTML5 */}
            <Modal
                visible={result !== null}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => result?.passed === true && result ? handleContinueAfterPass(result) : result?.passed === false ? closeCompletionDialogOnly() : undefined}
            >
                <Pressable style={styles.completionDialogBackdrop} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.completionDialogCard}>
                        {result !== null && (() => {
                            const passed = result.passed === true;
                            const br = result.bookReading;
                            const starEarned = br && br.starsToAward > 0;
                            const alreadyStar = br && (br.requirementMet || br.alreadyCompleted);
                            const moreToGo = passed && br && !starEarned && !alreadyStar;
                            return (
                                <View style={styles.completionDialogIconWrap}>
                                    {passed && (starEarned || alreadyStar) ? (
                                        <>
                                            <ThemedText style={styles.completionDialogEmoji}>🎉</ThemedText>
                                            <MaterialCommunityIcons name="star" size={44} color={colors.accent} />
                                        </>
                                    ) : passed && moreToGo ? (
                                        <MaterialCommunityIcons name="book-open-page-variant" size={52} color={colors.success} />
                                    ) : result.passed === false ? (
                                        <ThemedText style={styles.completionDialogEmoji}>💪</ThemedText>
                                    ) : (
                                        <MaterialCommunityIcons name="check-circle" size={52} color={colors.success} />
                                    )}
                                </View>
                            );
                        })()}
                        <ThemedText style={styles.completionDialogMessage}>
                            {result !== null && (() => {
                                if (result.passed === true && result.bookReading) {
                                    const br = result.bookReading;
                                    const more = Math.max(0, (br.requiredReadingCount ?? 5) - br.readingCount);
                                    if (br.starsToAward > 0) return 'You earned a star! ⭐';
                                    if (br.requirementMet || br.alreadyCompleted) return 'You already have your star! ⭐';
                                    return more === 1 ? 'You finished! 1 more to get your star.' : `You finished! ${more} more to get your star.`;
                                }
                                if (result.passed === false) return 'No worries! Try again or continue.';
                                return 'All done! Close when you\'re ready.';
                            })()}
                        </ThemedText>
                        <View style={styles.resultActions}>
                            {result?.passed === false ? (
                                <>
                                    <Pressable
                                        onPress={handleReload}
                                        style={({ pressed }) => [styles.resultBtn, styles.resultBtnPrimary, pressed && styles.resultBtnPressed]}
                                        accessibilityRole="button"
                                        accessibilityLabel="Try again"
                                    >
                                        <ThemedText style={styles.resultBtnPrimaryText}>Try again</ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={closeCompletionDialogOnly}
                                        style={({ pressed }) => [styles.resultBtn, pressed && styles.resultBtnPressed]}
                                        accessibilityRole="button"
                                        accessibilityLabel="Continue"
                                    >
                                        <ThemedText style={styles.resultBtnText}>Continue</ThemedText>
                                    </Pressable>
                                </>
                            ) : (
                                <Pressable
                                    onPress={() => result && handleContinueAfterPass(result)}
                                    style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
                                    accessibilityRole="button"
                                    accessibilityLabel="Continue"
                                >
                                    <ThemedText style={styles.doneButtonText}>Continue</ThemedText>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary,
    },
    containerPortrait: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing[4],
    },
    containerFullscreen: {
        backgroundColor: '#fff',
    },
    portraitCard: {
        width: '100%',
        maxWidth: PORTRAIT_CARD_MAX_WIDTH,
        backgroundColor: colors.bgCard,
        borderRadius: radii.xl,
        overflow: 'hidden',
        borderBottomWidth: 3,
        borderBottomColor: colors.secondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        backgroundColor: colors.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: colors.textInverse,
    },
    fullscreenBtn: {
        padding: spacing[2],
    },
    fullscreenWrap: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenContentBox: {
        flex: 1,
        maxWidth: '100%',
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    fullscreenWebView: {
        flex: 1,
        backgroundColor: '#fff',
    },
    cornerTopLeft: {
        position: 'absolute',
        top: spacing[4],
        left: spacing[4],
        maxWidth: '55%',
        zIndex: 10,
    },
    cornerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    cornerTopRight: {
        position: 'absolute',
        top: spacing[4],
        right: spacing[4],
        padding: spacing[2],
        zIndex: 10,
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: spacing[4],
        left: spacing[4],
        zIndex: 10,
    },
    cornerCountdown: {
        fontSize: 14,
        color: colors.primary,
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: spacing[4],
        right: spacing[4],
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[5],
        backgroundColor: colors.secondary,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
        zIndex: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing[6],
        gap: spacing[4],
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    errorText: {
        fontSize: 16,
        color: colors.textInverse,
        textAlign: 'center',
    },
    webViewWrap: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        position: 'relative',
    },
    webView: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[4],
        backgroundColor: colors.bgSecondary,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing[4],
    },
    countdownText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    countdownTextOverlay: {
        fontSize: 16,
        color: colors.textInverse,
    },
    doneButton: {
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[5],
        backgroundColor: colors.secondary,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    doneButtonPressed: {
        opacity: 0.9,
    },
    doneButtonDisabled: {
        opacity: 0.5,
    },
    doneButtonText: {
        fontSize: 16,
        fontFamily: Quicksand.semiBold,
        color: colors.textInverse,
    },
    doneButtonTextDisabled: {
        color: colors.textSecondary,
    },
    resultOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    completionDialogBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing[4],
    },
    completionDialogCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radii.xl,
        padding: spacing[6],
        minWidth: 280,
        maxWidth: 400,
        alignItems: 'center',
        gap: spacing[5],
    },
    completionDialogIconWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[3],
    },
    completionDialogEmoji: {
        fontSize: 48,
        lineHeight: 50,
    },
    completionDialogMessage: {
        fontSize: 18,
        fontFamily: Quicksand.semiBold,
        color: colors.primary,
        textAlign: 'center',
        lineHeight: 26,
    },
    resultCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radii.xl,
        padding: spacing[6],
        minWidth: 280,
        alignItems: 'center',
        gap: spacing[4],
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
    },
    resultScoreText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.primary,
    },
    resultStatusText: {
        fontSize: 16,
        fontWeight: '600',
    },
    resultPassed: {
        color: colors.success,
    },
    resultFailed: {
        color: colors.error,
    },
    resultProgressText: {
        fontSize: 16,
        color: colors.primary,
    },
    resultFriendlyText: {
        fontSize: 16,
        color: colors.primary,
        textAlign: 'center',
    },
    resultStarText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.accent,
        textAlign: 'center',
    },
    resultHint: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    resultActions: {
        flexDirection: 'row',
        gap: spacing[3],
        marginTop: spacing[2],
    },
    resultBtn: {
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        borderRadius: radii.lg,
        minWidth: 100,
        alignItems: 'center',
    },
    resultBtnPrimary: {
        backgroundColor: colors.secondary,
    },
    resultBtnPressed: {
        opacity: 0.8,
    },
    resultBtnText: {
        fontSize: 16,
        fontFamily: Quicksand.semiBold,
        color: colors.primary,
    },
    resultBtnPrimaryText: {
        fontSize: 16,
        fontFamily: Quicksand.semiBold,
        color: colors.textInverse,
    },
});
