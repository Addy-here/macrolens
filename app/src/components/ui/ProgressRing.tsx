import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { springs, withAlpha } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// react-native-svg's web shim does not take Reanimated animatedProps.
const CAN_ANIMATE = Platform.OS !== 'web';

/**
 * One progress ring. Fills with a spring unless Reduce Motion is on.
 * Past 100% it stays full; the number beside it says by how much.
 */
export function ProgressRing({
  progress,
  color,
  size = 40,
  strokeWidth = 4,
  trackColor,
  children,
}: {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(Math.max(progress, 0), 1);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const animate = CAN_ANIMATE && !reduceMotion;
  const value = useSharedValue(animate ? 0 : clamped);

  useEffect(() => {
    value.value = animate ? withSpring(clamped, springs.gentle) : clamped;
  }, [animate, clamped, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  const common = {
    cx: size / 2,
    cy: size / 2,
    r,
    strokeWidth,
    fill: 'none',
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle {...common} stroke={trackColor ?? withAlpha(color, 0.16)} />
        {clamped > 0 ? (
          animate ? (
            <AnimatedCircle
              {...common}
              stroke={color}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              animatedProps={animatedProps}
            />
          ) : (
            <Circle
              {...common}
              stroke={color}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - clamped)}
            />
          )
        ) : null}
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
