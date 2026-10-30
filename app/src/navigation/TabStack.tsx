import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors } from '../theme';

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
