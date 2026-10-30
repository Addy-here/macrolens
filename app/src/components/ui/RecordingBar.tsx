import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Icon } from './Icon';
import { colors, radius, spacing, typography } from '../../theme';

const BARS = 32;
const SAMPLE_MS = 80;

/**
 * What the composer turns into while listening: cancel, a live waveform of
 * the voice level with the elapsed time, and a check to finish. No labels —
 * the shapes say what they do.
 */
export function RecordingBar({
  level,
  finishing,
  onCancel,
  onDone,
}: {
  /** 0–1 input level from the recognizer. */
  level: SharedValue<number>;
  /** Final words are being processed; the check becomes a spinner. */
  finishing: boolean;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [samples, setSamples] = useState<number[]>(() => Array(BARS).fill(0));
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      setSamples((previous) => [...previous.slice(1), level.value]);
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, SAMPLE_MS);
    return () => clearInterval(timer);
  }, [level]);

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        onPress={onCancel}
        hitSlop={6}
        style={({ pressed }) => [styles.side, styles.cancel, pressed && styles.pressed]}
      >
        <Icon name="xmark" size={15} color={colors.textSecondary} weight="bold" />
      </Pressable>

      <View style={styles.wave} accessible accessibilityLabel={`Listening, ${seconds} seconds`}>
        <View style={styles.bars}>
          {samples.map((value, index) => (
            <View
              key={index}
              style={[
                styles.sample,
                { height: 3 + Math.round(value * 22), opacity: 0.35 + (index / BARS) * 0.65 },
              ]}
            />
          ))}
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Finish"
        onPress={onDone}
        disabled={finishing}
        hitSlop={6}
        style={({ pressed }) => [styles.side, styles.done, pressed && styles.pressed]}
      >
        {finishing ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Icon name="checkmark" size={17} color={colors.onAccent} weight="bold" />
        )}
      </Pressable>
    </View>
  );
}

const SIDE = 50;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  side: {
    width: SIDE,
    height: SIDE,
    borderRadius: SIDE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    backgroundColor: colors.fill,
  },
  done: {
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  wave: {
    flex: 1,
    height: SIDE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  bars: {
    flex: 1,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sample: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },
  time: {
    ...typography.statSmall,
    fontSize: 14,
    color: colors.accent,
    minWidth: 34,
    textAlign: 'right',
  },
});
