import React, { useEffect } from 'react';
import { Keyboard, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, spacing } from '../../theme';

/**
 * The pinned action bar at the bottom of a sheet. It rides up with the
 * keyboard, timed to the keyboard's own animation, so the action is never
 * hidden while typing. (KeyboardAvoidingView mis-measures inside a page
 * sheet, whose top is below the screen's.)
 */
export function SheetFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboard = useSharedValue(0);

  useEffect(() => {
    // The footer can appear while the keyboard is already up (e.g. after the first search result is added).
    keyboard.value = Keyboard.metrics()?.height ?? 0;
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subscriptions = [
      Keyboard.addListener(show, (event) => {
        keyboard.value = withTiming(event.endCoordinates.height, {
          duration: event.duration || 250,
          easing: Easing.out(Easing.cubic),
        });
      }),
      Keyboard.addListener(hide, (event) => {
        keyboard.value = withTiming(0, { duration: event.duration || 250, easing: Easing.out(Easing.cubic) });
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [keyboard]);

  const lift = useAnimatedStyle(() => ({
    paddingBottom: Math.max(insets.bottom + spacing.sm, keyboard.value + spacing.sm),
  }));

  return <Animated.View style={[styles.footer, lift]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm + 4,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
