import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { colors, spacing, typography } from '../../theme';

type Accessory = 'chevron' | 'check' | 'none';

/**
 * A grouped-list row in the Settings idiom: colored icon tile, title,
 * optional subtitle, and a trailing value, control, checkmark, or chevron.
 */
export function ListRow({
  icon,
  tint,
  title,
  subtitle,
  value,
  trailing,
  accessory = 'none',
  selected,
  first = false,
  onPress,
}: {
  icon?: SFSymbol;
  tint?: string;
  title: string;
  subtitle?: string;
  value?: string;
  trailing?: React.ReactNode;
  accessory?: Accessory;
  selected?: boolean;
  first?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      {icon ? (
        <View style={[styles.tile, { backgroundColor: tint ?? colors.tile.gray }]}>
          <Icon name={icon} size={15} color="#FFFFFF" />
        </View>
      ) : null}
      <View style={[styles.body, !first && styles.divider]}>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {trailing}
        {accessory === 'chevron' ? (
          <Icon name="chevron.right" size={13} color={colors.textTertiary} weight="bold" />
        ) : null}
        {accessory === 'check' ? (
          <View style={styles.check}>
            {selected ? <Icon name="checkmark" size={15} color={colors.accent} weight="bold" /> : null}
          </View>
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected != null ? { selected } : undefined}
      accessibilityHint={subtitle}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

/** Small header above a Settings group. Sentence case. */
export function GroupLabel({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.group}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  group: {
    ...typography.footnote,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    minHeight: 48,
  },
  pressed: {
    backgroundColor: colors.fill,
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingRight: spacing.md,
    minHeight: 48,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.textSecondary,
  },
  check: {
    width: 18,
    alignItems: 'center',
  },
});
