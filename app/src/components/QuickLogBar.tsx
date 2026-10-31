import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tappable } from './ui/Tappable';
import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import type { SFSymbol } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { Icon } from './ui/Icon';
import { useLogIntentStore, type LogIntent } from '../store/useLogIntentStore';
import { colors, spacing, typography } from '../theme';

function open(intent: LogIntent) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  useLogIntentStore.getState().request(intent);
  router.navigate('/log');
}

/**
 * The tab bar's accessory (iOS 26): log a meal by voice or photo from any tab.
 * Collapses to two icons when the tab bar minimizes on scroll.
 */
export function QuickLogBar() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const inline = placement === 'inline';

  return (
    <View style={[styles.bar, inline && styles.inline]}>
      {inline ? null : (
        <Tappable accessibilityRole="button" onPress={() => router.navigate('/log')} style={styles.title} hitSlop={6}>
          <Text style={styles.titleText}>Log a meal</Text>
        </Tappable>
      )}
      <Action icon="mic.fill" label="Speak" onPress={() => open({ kind: 'listen' })} />
      <Action icon="camera.fill" label="Photo" onPress={() => open({ kind: 'capture', source: 'camera' })} />
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  return (
    <Tappable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={styles.action}>
      <Icon name={icon} size={18} color={colors.accent} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.md + 4,
    paddingRight: spacing.sm,
  },
  inline: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  title: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  titleText: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  action: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
