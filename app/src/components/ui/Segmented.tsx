import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tappable } from './Tappable';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, radius, springs, typography } from '../../theme';

const INSET = 2;

/** iOS-style segmented control. The white thumb slides on a spring. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segment = width > 0 ? (width - INSET * 2) / options.length : 0;
  const x = useSharedValue(index * segment);
  const placed = useRef(false);

  useEffect(() => {
    if (segment === 0) return;
    const next = index * segment;
    // The first placement after layout jumps; later changes slide.
    x.value = reduceMotion || !placed.current ? next : withSpring(next, springs.snappy);
    placed.current = true;
  }, [index, reduceMotion, segment, x]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.track}
    >
      {segment > 0 ? <Animated.View style={[styles.thumb, { width: segment }, thumbStyle]} /> : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Tappable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={styles.segment}
          >
            <Text style={[styles.label, selected && styles.labelOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {option.label}
            </Text>
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.fill,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    padding: INSET,
    minHeight: 36,
  },
  thumb: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
    borderRadius: radius.sm - INSET,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minHeight: 32,
  },
  label: {
    ...typography.footnote,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  labelOn: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
