import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from './Icon';
import { colors, radius, spacing, typography } from '../../theme';

const STEPS = ['Finding foods…', 'Estimating portions…', 'Adding up nutrition…'];

/**
 * The photo being estimated, with a line sweeping it while the model works
 * and the stage named underneath. On failure it shows why and offers a retry.
 */
export function PhotoScan({
  uri,
  error,
  onRetry,
  onDiscard,
}: {
  uri: string;
  error?: string | null;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  return (
    <View style={styles.frame}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      {error ? (
        <View style={styles.overlay} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onDiscard} style={styles.action} hitSlop={6}>
              <Text style={styles.actionText}>Discard</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.action, styles.actionPrimary]} hitSlop={6}>
              <Icon name="arrow.clockwise" size={13} color={colors.textPrimary} />
              <Text style={[styles.actionText, styles.actionTextPrimary]}>Retry</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Scanning />
      )}
    </View>
  );
}

function Scanning() {
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  const [step, setStep] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 1600);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reduceMotion || height === 0) return;
    sweep.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.cubic) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [height, reduceMotion, sweep]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * Math.max(height - 2, 0) }],
  }));

  return (
    <View
      style={styles.overlay}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      accessibilityLiveRegion="polite"
      accessibilityLabel={STEPS[step]}
    >
      {!reduceMotion ? <Animated.View style={[styles.line, lineStyle]} /> : null}
      <ActivityIndicator color={colors.textOnMedia} />
      <Text style={styles.stepText}>{STEPS[step]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 4 / 3,
    borderRadius: radius.md + 2,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.viewfinder,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.scrim,
  },
  line: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  stepText: {
    ...typography.subheadline,
    color: colors.textOnMedia,
  },
  errorText: {
    ...typography.subheadline,
    color: colors.textOnMedia,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  actionPrimary: {
    backgroundColor: colors.surface,
  },
  actionText: {
    ...typography.subheadline,
    color: colors.textOnMedia,
  },
  actionTextPrimary: {
    color: colors.textPrimary,
  },
});
