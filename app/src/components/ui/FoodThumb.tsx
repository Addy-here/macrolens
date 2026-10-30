import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from './Icon';
import { colors, radius } from '../../theme';

/** The meal photo as a rounded square. Without a photo, a quiet utensil mark. */
export function FoodThumb({ uri, size = 52 }: { uri?: string; size?: number }) {
  const shape = { width: size, height: size, borderRadius: Math.round(size * 0.27) };
  if (!uri) {
    return (
      <View style={[styles.empty, shape]}>
        <Icon name="fork.knife" size={size * 0.36} color={colors.textTertiary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[styles.image, shape]}
      contentFit="cover"
      transition={180}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  image: {
    backgroundColor: colors.surfaceRaised,
    borderCurve: 'continuous',
    borderRadius: radius.sm,
  },
});
