import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors, spacing, typography } from '../../theme';
import { addDays, localDateKey, startOfWeek } from '../../utils/date';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekStrip({
  selectedKey,
  onSelect,
}: {
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const start = startOfWeek(new Date());
  const days = WEEKDAYS.map((label, index) => {
    const date = addDays(start, index);
    return { label, date, key: localDateKey(date) };
  });

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const selected = day.key === selectedKey;
        return (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${day.label} ${day.date.getDate()}`}
            onPress={() => onSelect(day.key)}
            style={styles.day}
          >
            <Text style={[styles.weekday, selected && styles.weekdayOn]}>{day.label}</Text>
            <DayNumber selected={selected}>{String(day.date.getDate())}</DayNumber>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayNumber({ selected, children }: { selected: boolean; children: string }) {
  const liquid = selected && Platform.OS === 'ios' && isLiquidGlassAvailable();
  return (
    <View style={styles.numWrap}>
      {liquid ? (
        <GlassView
          pointerEvents="none"
          style={styles.glass}
          glassEffectStyle="regular"
          tintColor={colors.accentSoft}
          isInteractive
          colorScheme="light"
        />
      ) : selected ? (
        <BlurView pointerEvents="none" intensity={70} tint="systemChromeMaterialLight" style={styles.glass} />
      ) : null}
      <Text style={[styles.num, selected && styles.numOn]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  weekday: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
  },
  weekdayOn: {
    color: colors.accent,
  },
  numWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glass: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
  },
  num: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
  },
  numOn: {
    color: colors.accent,
  },
});
