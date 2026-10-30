import React from 'react';
import { View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';

/** SF Symbol at a given point size. Off iOS it reserves the space and draws nothing. */
export function Icon({
  name,
  size = 17,
  color,
  weight = 'semibold',
}: {
  name: SFSymbol;
  size?: number;
  color: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      fallback={<View style={{ width: size, height: size }} />}
    />
  );
}
