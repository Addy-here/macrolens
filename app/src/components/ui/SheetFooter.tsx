import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

/**
 * The pinned action bar at the bottom of a sheet. It follows the keyboard's
 * real frame (react-native-keyboard-controller), so the action is never
 * under the keyboard and never lags behind it.
 */
export function SheetFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>{children}</View>
    </KeyboardStickyView>
  );
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
