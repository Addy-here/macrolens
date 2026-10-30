import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { SFSymbol } from 'expo-symbols';
import { Icon } from './Icon';
import { resolvePhotoUri } from '../../services/photos';
import { colors, radius } from '../../theme';

/** The meal photo as a rounded square. Without a photo, the meal's own symbol on a soft accent tile. */
export function FoodThumb({ uri, size = 52, symbol = 'fork.knife' }: { uri?: string; size?: number; symbol?: SFSymbol }) {
  const shape = { width: size, height: size, borderRadius: Math.round(size * 0.27) };
  if (!uri) {
    return (
      <View style={[styles.empty, shape]}>
        <Icon name={symbol} size={size * 0.34} color={colors.accent} weight="regular" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: resolvePhotoUri(uri) }}
      style={[styles.image, shape]}
      contentFit="cover"
      transition={180}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.accentSoft,
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
