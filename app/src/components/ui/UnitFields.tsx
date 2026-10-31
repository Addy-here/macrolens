import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import {
  cmFromFeetInches,
  feetInches,
  KG_PER_LB,
  LB_PER_ST,
  stonesPounds,
  weightToKg,
  weightValue,
  type HeightUnit,
  type WeightUnit,
} from '../../utils/units';

/**
 * Number fields that show and take a value in the person's unit and report
 * it back in metric. Stones and feet get two boxes (12 st 3 lb, 5′ 11″).
 */

const parse = (text: string) => {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

const trim = (value: number, digits: number) => String(Math.round(value * 10 ** digits) / 10 ** digits);

type Variant = 'hero' | 'row';

function weightDraft(kg: number | null, unit: WeightUnit): string[] {
  if (kg == null) return unit === 'st' ? ['', ''] : [''];
  if (unit === 'st') {
    const { st, lb } = stonesPounds(kg);
    return [String(st), trim(lb, 1)];
  }
  return [weightValue(kg, unit).toFixed(1)];
}

export function WeightInput({
  kg,
  onChangeKg,
  unit,
  variant = 'row',
  placeholderKg,
  label,
  inputRef,
  onSubmit,
  autoFocus,
}: {
  kg: number | null;
  onChangeKg: (kg: number | null) => void;
  unit: WeightUnit;
  variant?: Variant;
  placeholderKg?: number;
  label: string;
  inputRef?: React.Ref<React.ComponentRef<typeof TextInput>>;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const [parts, setParts] = useState(() => weightDraft(kg, unit));
  const emitted = useRef<number | null>(kg);

  // Outside changes (a new unit, a reset) redraw the field; our own typing doesn't.
  useEffect(() => {
    if (kg !== emitted.current || parts.length !== (unit === 'st' ? 2 : 1)) {
      setParts(weightDraft(kg, unit));
      emitted.current = kg;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kg, unit]);

  const update = (index: number, text: string) => {
    const next = [...parts];
    next[index] = text;
    setParts(next);
    let value: number | null;
    if (unit === 'st') {
      const st = parse(next[0]);
      const lb = parse(next[1]) ?? 0;
      value = st == null && next[1].trim() === '' ? null : ((st ?? 0) * LB_PER_ST + lb) * KG_PER_LB;
    } else {
      const n = parse(next[0]);
      value = n == null ? null : weightToKg(n, unit);
    }
    emitted.current = value;
    onChangeKg(value);
  };

  const placeholder = weightDraft(placeholderKg ?? null, unit);
  const inputStyle: TextStyle[] = [variant === 'hero' ? styles.heroInput : styles.rowInput];

  if (unit === 'st') {
    return (
      <View style={[styles.wrap, variant === 'hero' && styles.heroWrap]}>
        <TextInput
          ref={inputRef}
          autoFocus={autoFocus}
          value={parts[0]}
          onChangeText={(text) => update(0, text)}
          keyboardType="number-pad"
          keyboardAppearance="light"
          placeholder={placeholder[0] || '0'}
          placeholderTextColor={colors.textTertiary}
          selectTextOnFocus
          accessibilityLabel={`${label}, stones`}
          style={[...inputStyle, styles.short]}
        />
        <Text style={variant === 'hero' ? styles.heroUnit : styles.rowUnit}>st</Text>
        <TextInput
          value={parts[1]}
          onChangeText={(text) => update(1, text)}
          keyboardType="decimal-pad"
          keyboardAppearance="light"
          placeholder={placeholder[1] || '0'}
          placeholderTextColor={colors.textTertiary}
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          accessibilityLabel={`${label}, pounds`}
          style={[...inputStyle, styles.short]}
        />
        <Text style={variant === 'hero' ? styles.heroUnit : styles.rowUnit}>lb</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, variant === 'hero' && styles.heroWrap]}>
      <TextInput
        ref={inputRef}
        autoFocus={autoFocus}
        value={parts[0]}
        onChangeText={(text) => update(0, text)}
        keyboardType="decimal-pad"
        keyboardAppearance="light"
        placeholder={placeholder[0] || '0.0'}
        placeholderTextColor={colors.textTertiary}
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        accessibilityLabel={`${label} in ${unit === 'kg' ? 'kilograms' : 'pounds'}`}
        style={[...inputStyle, variant === 'hero' && styles.heroFlex]}
      />
      <Text style={variant === 'hero' ? styles.heroUnit : styles.rowUnit}>{unit}</Text>
    </View>
  );
}

function heightDraft(cm: number, unit: HeightUnit): string[] {
  if (unit === 'ftin') {
    const { ft, inch } = feetInches(cm);
    return [String(ft), String(inch)];
  }
  return [String(Math.round(cm))];
}

export function HeightInput({ cm, onChangeCm, unit }: { cm: number; onChangeCm: (cm: number) => void; unit: HeightUnit }) {
  const [parts, setParts] = useState(() => heightDraft(cm, unit));
  const emitted = useRef(cm);

  useEffect(() => {
    if (cm !== emitted.current || parts.length !== (unit === 'ftin' ? 2 : 1)) {
      setParts(heightDraft(cm, unit));
      emitted.current = cm;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cm, unit]);

  const commit = (next: string[]) => {
    let value: number | null;
    if (unit === 'ftin') {
      const ft = parse(next[0]);
      const inch = parse(next[1]) ?? 0;
      value = ft == null ? null : cmFromFeetInches(ft, inch);
    } else {
      value = parse(next[0]);
    }
    if (value != null && value >= 90 && value <= 250) {
      emitted.current = value;
      onChangeCm(value);
    }
  };

  const update = (index: number, text: string) => {
    const next = [...parts];
    next[index] = text;
    setParts(next);
    commit(next);
  };

  // An impossible height snaps back to the last good one when the field is left.
  const restore = () => setParts(heightDraft(emitted.current, unit));

  if (unit === 'ftin') {
    return (
      <View style={styles.wrap}>
        <TextInput
          value={parts[0]}
          onChangeText={(text) => update(0, text)}
          onEndEditing={restore}
          keyboardType="number-pad"
          keyboardAppearance="light"
          selectTextOnFocus
          accessibilityLabel="Height, feet"
          style={[styles.rowInput, styles.short]}
        />
        <Text style={styles.rowUnit}>ft</Text>
        <TextInput
          value={parts[1]}
          onChangeText={(text) => update(1, text)}
          onEndEditing={restore}
          keyboardType="number-pad"
          keyboardAppearance="light"
          selectTextOnFocus
          accessibilityLabel="Height, inches"
          style={[styles.rowInput, styles.short]}
        />
        <Text style={styles.rowUnit}>in</Text>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <TextInput
        value={parts[0]}
        onChangeText={(text) => update(0, text)}
        onEndEditing={restore}
        keyboardType="number-pad"
        keyboardAppearance="light"
        selectTextOnFocus
        accessibilityLabel="Height in centimetres"
        style={styles.rowInput}
      />
      <Text style={styles.rowUnit}>cm</Text>
    </View>
  );
}

/** A whole-number field for a row: birth year, a percentage, an amount. */
export function IntegerInput({
  value,
  onChange,
  unit,
  label,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
}: {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  label: string;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next);
          const parsed = parseInt(next, 10);
          if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed);
        }}
        onEndEditing={() => setText(String(value))}
        keyboardType="number-pad"
        keyboardAppearance="light"
        selectTextOnFocus
        accessibilityLabel={unit ? `${label} in ${unit}` : label}
        style={styles.rowInput}
      />
      {unit ? <Text style={styles.rowUnit}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroWrap: {
    flex: 1,
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  rowInput: {
    ...typography.statSmall,
    fontSize: 17,
    color: colors.textPrimary,
    minWidth: 52,
    textAlign: 'right',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  short: {
    minWidth: 30,
  },
  rowUnit: {
    ...typography.callout,
    color: colors.textTertiary,
    minWidth: 20,
  },
  heroInput: {
    ...typography.statLarge,
    color: colors.textPrimary,
    padding: 0,
    minWidth: 40,
  },
  heroFlex: {
    flex: 1,
  },
  heroUnit: {
    ...typography.headline,
    color: colors.textSecondary,
  },
});
