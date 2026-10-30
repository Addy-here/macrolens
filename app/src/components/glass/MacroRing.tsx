import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from 'react-native-reanimated';
import { springs, typography, colors } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// react-native-svg's web shim (WebShape) doesn't reliably interop with
// Reanimated's `animatedProps` on web — it throws inside
// `WebShape.render` ("this.tag" resolves oddly through the animated
// wrapper). This is a web-target-only bug; native iOS/Android use Skia
// and are unaffected. Render a static (non-animated) circle on web so
// the screen doesn't crash — the spring animation is a native-platform
// nicety, not core functionality.
const USE_ANIMATED_RING = Platform.OS !== 'web';

interface MacroRingProps {
  /** 0-1 progress value (consumed / target). Values > 1 are clamped visually
   *  but the raw ratio can still be shown in the label if desired. */
  progress: number;
  color: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  valueText?: string;
}

/**
 * Single animated ring, the base unit for calorie/macro progress display.
 * Compose 3-4 of these (concentric or side-by-side) per screen — see
 * docs/DESIGN-SYSTEM.md "MacroRing" entry. Motion uses a spring, not a
 * timing curve, per the design system's motion principle.
 */
export function MacroRing({
  progress,
  color,
  trackColor,
  size = 120,
  strokeWidth = 12,
  label,
  valueText,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const animate = USE_ANIMATED_RING && !reduceMotion;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    animatedProgress.value = animate ? withSpring(clamped, springs.default) : clamped;
  }, [animate, animatedProgress, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View
      accessible={Boolean(valueText || label)}
      accessibilityLabel={`${valueText ?? ''} ${label ?? ''}`.trim()}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        {animate ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
          />
        ) : (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - Math.min(Math.max(progress, 0), 1))}
            strokeLinecap="round"
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
          />
        )}
      </Svg>
      <View style={styles.center}>
        {valueText && (
          <Text style={[typography.statMedium, { color: colors.textPrimary }]}>
            {valueText}
          </Text>
        )}
        {label && (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
});
