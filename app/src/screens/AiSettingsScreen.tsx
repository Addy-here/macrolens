import React from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router';
import { AiKeySection } from '../components/AiKeySection';
import { colors, spacing } from '../theme';

const HEADER = { title: 'AI', headerLargeTitleEnabled: false };

/** Provider, model, and the person's own key, for photo estimates and AI matching. */
export function AiSettingsScreen() {
  return (
    <>
      <Stack.Screen options={HEADER} />
      <KeyboardAwareScrollView
        bottomOffset={64}
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AiKeySection />
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.tabBottom,
  },
});
