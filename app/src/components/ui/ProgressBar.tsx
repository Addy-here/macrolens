import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { springs, withAlpha } from '../../theme';

/** Capsule meter. The track is a light step of the fill's own hue. */
export function ProgressBar({
  progress,
  color,
  height = 6,
}: {
  progress: number;
  color: string;
  height?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const target = Math.min(Math.max(progress, 0), 1) * width;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = reduceMotion ? target : withSpring(target, springs.gentle);
  }, [fill, reduceMotion, target]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fill.value > 0 ? Math.max(fill.value, height) : 0,
  }));

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: withAlpha(color, 0.16) },
      ]}
    >
      <Animated.View
        style={[styles.fill, { borderRadius: height / 2, backgroundColor: color }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
