import React from 'react';
import { NativeTabs } from 'expo-router/native-tabs';
import { colors } from '../../src/theme';

/**
 * Native iOS tab bar via expo-router's (stable) NativeTabs. This renders
 * the REAL UITabBarController under the hood — on iOS 26 it automatically
 * gets the floating Liquid Glass pill tab bar with no manual styling.
 * Scroll views get a system content inset. Pinned footers (the Log
 * buttons) still add their own padding above that safe area, because a
 * plain View is not inset automatically. See docs/DECISIONS.md.
 *
 * This REPLACES the old @react-navigation/bottom-tabs + GlassView tab bar
 * (RootNavigator.tsx), which only approximated the native look with a
 * hand-drawn blur, not the real system-rendered pill.
 */
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="house.fill" />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <NativeTabs.Trigger.Icon sf="camera.fill" />
        <NativeTabs.Trigger.Label>Log</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
