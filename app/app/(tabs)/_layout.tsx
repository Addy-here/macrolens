import React from 'react';
import { NativeTabs } from 'expo-router/native-tabs';

/**
 * Native iOS tab bar via expo-router's (stable) NativeTabs. This renders
 * the REAL UITabBarController under the hood — on iOS 26 it automatically
 * gets the floating Liquid Glass pill tab bar with no manual styling, and
 * screens get the correct safe-area/tab-bar-height insets for free, so
 * content can never render underneath it. This is what structurally
 * fixes the "Upload a Picture" overlap bug found during the web smoke
 * test (padding hacks were a band-aid; the real fix is a real native tab
 * bar that reports its own height to the OS). See docs/DECISIONS.md.
 *
 * This REPLACES the old @react-navigation/bottom-tabs + GlassView tab bar
 * (RootNavigator.tsx), which only approximated the native look with a
 * hand-drawn blur, not the real system-rendered pill.
 */
export default function TabsLayout() {
  return (
    <NativeTabs>
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
