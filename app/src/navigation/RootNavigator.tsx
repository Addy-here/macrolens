import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { HomeScreen } from '../screens/HomeScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, blur } from '../theme';

export type RootTabParamList = {
  Home: undefined;
  Camera: undefined;
  Plan: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const SYMBOLS: Record<keyof RootTabParamList, string> = {
  Home: 'house.fill',
  Camera: 'camera.fill',
  Plan: 'chart.line.uptrend.xyaxis',
  Settings: 'person.crop.circle.fill',
};

function TabIcon({
  route,
  color,
}: {
  route: keyof RootTabParamList;
  color: string;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={SYMBOLS[route] as any}
        size={24}
        tintColor={color}
        type="hierarchical"
      />
    );
  }
  // SF Symbols are iOS-only; Android/web fall back to a plain dot so the
  // tab bar still renders sensibly rather than crashing.
  return null;
}

/**
 * Root tab navigator. The tab bar background uses the real native
 * Liquid Glass material (GlassView) on iOS 26+, with SF Symbols
 * (expo-symbols) for icons so the whole bar is genuinely native iOS
 * chrome rather than a drawn approximation. Falls back to BlurView on
 * older iOS/Android/web.
 */
export function RootNavigator() {
  const useNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () =>
          useNativeGlass ? (
            <GlassView style={{ flex: 1 }} glassEffectStyle="regular" />
          ) : (
            <BlurView intensity={blur.tabBar} tint="dark" style={{ flex: 1 }} />
          ),
        tabBarIcon: ({ color }) => (
          <TabIcon route={route.name as keyof RootTabParamList} color={color} />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Today' }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{ tabBarLabel: 'Log' }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{ tabBarLabel: 'Plan' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
