import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tappable } from './Tappable';
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
  destructive = false,
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
  /** Red title, for an action that deletes. */
  destructive?: boolean;
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
        <View style={value ? styles.textBesideValue : styles.text}>
          <Text style={[styles.title, destructive && styles.destructive]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text style={styles.value} numberOfLines={2}>
            {value}
          </Text>
        ) : null}
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
    <Tappable
      accessibilityRole="button"
      accessibilityState={selected != null ? { selected } : undefined}
      accessibilityHint={subtitle}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      feedback="row"
      style={styles.row}
    >
      {content}
    </Tappable>
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
  // A short title keeps its width and a long value wraps instead. (Not `flex: 1`, whose zero basis lets the title collapse.)
  textBesideValue: {
    flexGrow: 1,
    flexShrink: 0,
    gap: 2,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  destructive: {
    color: colors.danger,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  check: {
    width: 18,
    alignItems: 'center',
  },
});
