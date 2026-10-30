import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { ProgressRing } from './ProgressRing';
import { colors, spacing, typography } from '../../theme';
import { addDays, localDateKey, startOfWeek } from '../../utils/date';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SIZE = 38;

/**
 * Sunday-start week. Each day carries a thin calorie ring, so the week
 * reads at a glance the way Fitness shows a week of Activity rings.
 */
export function WeekStrip({
  selectedKey,
  onSelect,
  progressByDay,
}: {
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Calories eaten / target, keyed by local date. */
  progressByDay: Record<string, number>;
}) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const start = startOfWeek(today);

  return (
    <View style={styles.row}>
      {WEEKDAYS.map((letter, index) => {
        const date = addDays(start, index);
        const key = localDateKey(date);
        const selected = key === selectedKey;
        const isToday = key === todayKey;
        const future = key > todayKey;
        const progress = progressByDay[key] ?? 0;

        return (
          <Pressable
            key={key}
            disabled={future}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: future }}
            accessibilityLabel={`${WEEKDAY_NAMES[index]} ${date.getDate()}${
              progress > 0 ? `, ${Math.round(progress * 100)} percent of calories` : ''
            }`}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelect(key);
            }}
            style={styles.day}
          >
            <Text style={[styles.weekday, isToday && styles.weekdayToday]}>{letter}</Text>
            <ProgressRing
              progress={future ? 0 : progress}
              color={colors.calories}
              size={SIZE}
              strokeWidth={3}
              trackColor={future ? 'transparent' : colors.track}
            >
              {selected ? <SelectedDisc /> : null}
              <Text
                style={[
                  styles.num,
                  isToday && styles.numToday,
                  future && styles.numFuture,
                  selected && styles.numSelected,
                ]}
              >
                {date.getDate()}
              </Text>
            </ProgressRing>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The selected day is Liquid Glass tinted with the accent where the system supports it. */
function SelectedDisc() {
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView
        pointerEvents="none"
        style={styles.disc}
        glassEffectStyle="regular"
        tintColor={colors.accent}
        colorScheme="light"
      />
    );
  }
  return <View pointerEvents="none" style={[styles.disc, styles.discSolid]} />;
}

const DISC = SIZE - 10;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  weekday: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  weekdayToday: {
    color: colors.accent,
  },
  disc: {
    position: 'absolute',
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    overflow: 'hidden',
  },
  discSolid: {
    backgroundColor: colors.accent,
  },
  num: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  numToday: {
    color: colors.accent,
  },
  numFuture: {
    color: colors.textTertiary,
  },
  numSelected: {
    color: colors.onAccent,
  },
});
