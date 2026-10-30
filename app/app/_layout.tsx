import React, { useEffect } from 'react';
import { Appearance } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
              presentation: 'formSheet',
              contentStyle: { backgroundColor: colors.background },
              sheetGrabberVisible: true,
              sheetAllowedDetents: [1],
              sheetCornerRadius: 30,
            }}
          />
          <Stack.Screen name="dev" options={{ animation: 'none' }} />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
