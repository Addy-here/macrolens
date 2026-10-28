import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { colors, blur } from '../theme';

export type RootTabParamList = {
  Home: undefined;
  Camera: undefined;
  Plan: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Root tab navigator. The tab bar itself should read as a floating glass
 * pill per docs/DESIGN-SYSTEM.md "GlassTabBar" — using tabBarBackground +
 * transparent styling here rather than a fully custom tab bar component
 * for v1 (revisit with a hand-built GlassTabBar once the three screens
 * are fleshed out and we know the final icon set).
 */
export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView intensity={blur.tabBar} tint="dark" style={{ flex: 1 }} />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
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
    </Tab.Navigator>
  );
}
