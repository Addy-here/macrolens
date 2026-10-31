import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tappable } from './Tappable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../../store/useToastStore';
import { useDevAction } from '../../dev/devScroll';
import { Icon } from './Icon';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const VISIBLE_MS = 4500;
/** Clears the floating tab bar and the quick-log bar above it. */
const TAB_BAR_CLEARANCE = 128;

/** Renders the current toast above the tab bar. Mount once, at the root. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);

  useDevAction('toast.action', () => {
    toast?.action?.run();
    hide(toast?.id);
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => hide(toast.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [hide, toast]);

  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutDown.duration(160)}
        style={styles.toast}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        {toast.tone === 'done' ? <Icon name="checkmark.circle.fill" size={18} color="#4CD388" weight="regular" /> : null}
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Tappable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              void Haptics.selectionAsync();
              toast.action?.run();
              hide(toast.id);
            }}
          >
            <Text style={styles.action}>{toast.action.label}</Text>
          </Tappable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 48,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
    ...shadow.raised,
  },
  message: {
    ...typography.subheadline,
    fontWeight: '500',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  action: {
    ...typography.subheadline,
    color: '#FF8A5C',
    marginLeft: spacing.xs,
  },
});
