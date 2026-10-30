import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { colors, radius, typography } from '../../theme';

/**
 * Minus, value, plus. Tapping the number lets you type an exact amount.
 * Each step gives a selection tick.
 */
export function Stepper({
  value,
  onChange,
  step = 10,
  min = 1,
  unit,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  unit: string;
  label: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const nudge = (direction: 1 | -1) => {
    const next = Math.max(min, Math.round((value + direction * step) / step) * step);
    if (next === value) return;
    void Haptics.selectionAsync();
    onChange(next);
  };

  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    // Typed amounts are kept exact: whole grams, or quarters of a unit.
    const exact = step < 1 ? Math.round(parsed * 4) / 4 : Math.round(parsed);
    if (Number.isFinite(parsed) && exact >= min) onChange(exact);
    else setDraft(String(value));
  };

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${value} ${unit}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <Pressable hitSlop={6} onPress={() => nudge(-1)} style={styles.button} importantForAccessibility="no">
        <Icon name="minus" size={14} color={colors.textPrimary} weight="bold" />
      </Pressable>
      <View style={styles.valueWrap}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onEndEditing={commit}
          keyboardType={step < 1 ? 'decimal-pad' : 'number-pad'}
          keyboardAppearance="light"
          selectTextOnFocus
          style={styles.value}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <Pressable hitSlop={6} onPress={() => nudge(1)} style={styles.button} importantForAccessibility="no">
        <Icon name="plus" size={14} color={colors.textPrimary} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    padding: 3,
    alignSelf: 'flex-start',
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: 6,
  },
  value: {
    ...typography.statSmall,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'right',
    padding: 0,
  },
  unit: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginLeft: 2,
  },
});
