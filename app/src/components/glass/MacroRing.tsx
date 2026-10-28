import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from 'react-native-reanimated';
import { springs, typography, colors } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MacroRingProps {
  /** 0-1 progress value (consumed / target). Values > 1 are clamped visually
   *  but the raw ratio can still be shown in the label if desired. */
  progress: number;
  color: string;
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
  size = 120,
  strokeWidth = 12,
  label,
  valueText,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    animatedProgress.value = withSpring(clamped, springs.default);
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.glassBorder}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
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
