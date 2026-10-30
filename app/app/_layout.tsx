import React, { useEffect } from 'react';
import { Appearance } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ToastHost } from '../src/components/ui/ToastHost';
import { DevBridge } from '../src/dev/DevBridge';
import { colors } from '../src/theme';
import { useAiKeyStore } from '../src/store/useAiKeyStore';

Appearance.setColorScheme('light');

/**
 * Root layout for the whole app (expo-router). Wraps every route in the
 * providers that used to live in App.tsx before the migration to
 * file-based routing + NativeTabs (see docs/DECISIONS.md — "Switched to
 * expo-router NativeTabs for a genuinely native tab bar").
 */
export default function RootLayout() {
  const hydrate = useAiKeyStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardProvider>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="review"
            options={{
              // A page sheet, not a formSheet: formSheet resizes the first ScrollView to fill the
              // sheet and can't hold a pinned footer (react-native-screens RNSScreenContentWrapper).
              presentation: 'modal',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              // A page sheet, not a formSheet: formSheet resizes the first ScrollView to fill the
              // sheet and can't hold a pinned footer (react-native-screens RNSScreenContentWrapper).
              presentation: 'modal',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen
            name="food-editor"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen name="dev" options={{ animation: 'none' }} />
        </Stack>
        <ToastHost />
        {__DEV__ ? <DevBridge /> : null}
        <StatusBar style="dark" />
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
