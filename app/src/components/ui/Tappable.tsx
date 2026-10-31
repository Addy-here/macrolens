import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { press } from '../../theme';

/** A Pressable with the app's touch feedback (see theme/press.ts). Defaults to `dim`. */
export function Tappable({
  style,
  feedback = 'dim',
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; feedback?: keyof typeof press }) {
  return <Pressable {...props} style={({ pressed }) => [style, pressed && !props.disabled && press[feedback]]} />;
}
