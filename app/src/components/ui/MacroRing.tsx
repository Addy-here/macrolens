import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { Macros } from '../../types';

const GAP = 2;

/**
 * A food's calories split into protein, carbs, and fat, as a small ring with
 * a gap between segments. A dashed gray ring means the food wasn't found.
 */
export function MacroRing({ macros, size = 30, stroke = 4, unknown = false }: { macros?: Macros; size?: number; stroke?: number; unknown?: boolean }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const parts = macros
    ? [
        { color: colors.protein, kcal: macros.proteinG * 4 },
        { color: colors.carbs, kcal: macros.carbsG * 4 },
        { color: colors.fat, kcal: macros.fatG * 9 },
      ].filter((part) => part.kcal > 0)
    : [];
  const total = parts.reduce((sum, part) => sum + part.kcal, 0);
  const gap = parts.length > 1 ? GAP : 0;

  let start = 0;
  const segments = parts.map((part) => {
    const length = (part.kcal / total) * circumference;
    const segment = { color: part.color, length: Math.max(length - gap, 0.5), start };
    start += length;
    return segment;
  });

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }} accessibilityElementsHidden importantForAccessibility="no">
      {unknown || total === 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.fillStrong}
          strokeWidth={stroke}
          strokeDasharray={unknown ? '3 3' : undefined}
          fill="none"
        />
      ) : (
        segments.map((segment) => (
          <Circle
            key={segment.color}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={`${segment.length} ${circumference}`}
            strokeDashoffset={-segment.start}
            fill="none"
          />
        ))
      )}
    </Svg>
  );
}
