import React from 'react';
import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { QuickLogBar } from '../../src/components/QuickLogBar';
import { colors } from '../../src/theme';

/**
 * Native iOS tab bar via expo-router's NativeTabs: the real
 * UITabBarController, which on iOS 26 is the floating Liquid Glass bar.
 * Each tab is a folder with its own native stack (see TabStack) so its
 * root screen has a system large title. See docs/DECISIONS.md.
 */
export default function TabsLayout() {
  // Log has Speak and Photo in its own card; the quick-log bar would repeat them there.
  const onLog = usePathname().startsWith('/log');
  return (
    <NativeTabs tintColor={colors.accent} minimizeBehavior="onScrollDown">
      {onLog ? null : (
        <NativeTabs.BottomAccessory>
          <QuickLogBar />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="(today)">
        <NativeTabs.Trigger.Icon sf={{ default: 'fork.knife.circle', selected: 'fork.knife.circle.fill' }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} />
        <NativeTabs.Trigger.Label>Log</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
