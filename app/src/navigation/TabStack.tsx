import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Each tab root sits in its own native stack so it gets the system large
 * title that collapses into the bar on scroll. On iOS 26 the bar uses the
 * system scroll-edge effect; earlier versions get a chrome blur instead.
 * Screens use `contentInsetAdjustmentBehavior="automatic"` on their
 * ScrollView, so content starts below the title and ends above the tab bar.
 */
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerTransparent: true,
        headerBlurEffect: liquidGlass ? undefined : 'systemChromeMaterialLight',
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.textPrimary },
        headerLargeTitleStyle: { color: colors.textPrimary },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}

/** iOS tab bar height above the home indicator. */
const TAB_BAR = 49;

/**
 * Bottom padding for a screen pushed inside a tab. Unlike a tab's root
 * screen, iOS doesn't add the tab bar to a pushed screen's automatic inset,
 * so its last rows would sit under the tab bar and the Log a meal bar.
 */
export function usePushedTabPadding() {
  const { bottom } = useSafeAreaInsets();
  return spacing.tabBottom + TAB_BAR + bottom;
}
