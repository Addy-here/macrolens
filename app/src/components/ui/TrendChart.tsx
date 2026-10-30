import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import type { TrendPoint } from '../../utils/weight';

const PAD = { top: 12, right: 44, bottom: 24, left: 4 };

/**
 * Monotone cubic path (Fritsch–Carlson): smooth like a drawn curve, but it
 * never overshoots the data, so the line can't invent a dip that wasn't there.
 */
function monotonePath(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return '';
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x || 1e-6;
    slope[i] = (points[i + 1].y - points[i].y) / dx[i];
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  tangent[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const c1x = p0.x + dx[i] / 3;
    const c1y = p0.y + (tangent[i] * dx[i]) / 3;
    const c2x = p1.x - dx[i] / 3;
    const c2y = p1.y - (tangent[i + 1] * dx[i]) / 3;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

function shortDate(time: number) {
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Weight trend. Gray dots are the scale; the orange line is the smoothed
 * trend that the plan follows. Drag across it to read any day.
 */
export function TrendChart({
  points,
  goalKg,
  height = 200,
}: {
  points: TrendPoint[];
  goalKg?: number;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (points.length < 2 || width === 0) return null;
    const values = points.flatMap((point) => [point.scale, point.trend]);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const showGoal = goalKg != null && goalKg >= min - 1.5 && goalKg <= max + 1.5;
    if (showGoal && goalKg != null) {
      min = Math.min(min, goalKg);
      max = Math.max(max, goalKg);
    }
    const pad = Math.max((max - min) * 0.12, 0.3);
    min -= pad;
    max += pad;

    const t0 = points[0].time;
    const t1 = points[points.length - 1].time;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x = (time: number, index: number) =>
      PAD.left + (t1 > t0 ? (time - t0) / (t1 - t0) : index / (points.length - 1)) * innerW;
    const y = (kg: number) => PAD.top + (1 - (kg - min) / (max - min)) * innerH;

    const xy = points.map((point, index) => ({
      x: x(point.time, index),
      trendY: y(point.trend),
      scaleY: y(point.scale),
    }));
    const line = monotonePath(xy.map((p) => ({ x: p.x, y: p.trendY })));
    const bottom = PAD.top + innerH;
    const area = `${line} L${xy[xy.length - 1].x.toFixed(1)},${bottom} L${xy[0].x.toFixed(1)},${bottom} Z`;
    const ticks = [max - pad, (max + min) / 2, min + pad].map((kg) => ({ kg, y: y(kg) }));

    return { xy, line, area, ticks, bottom, goalY: showGoal && goalKg != null ? y(goalKg) : null };
  }, [goalKg, height, points, width]);

  const pick = (locationX: number) => {
    if (!geometry) return;
    let best = 0;
    for (let i = 1; i < geometry.xy.length; i++) {
      if (Math.abs(geometry.xy[i].x - locationX) < Math.abs(geometry.xy[best].x - locationX)) best = i;
    }
    if (best !== active) {
      void Haptics.selectionAsync();
      setActive(best);
    }
  };

  const first = points[0];
  const last = points[points.length - 1];
  const summary =
    first && last
      ? `Weight trend from ${first.trend.toFixed(1)} to ${last.trend.toFixed(1)} kilograms, ${shortDate(
          first.time,
        )} to ${shortDate(last.time)}`
      : 'Weight trend';

  const focus = active != null && geometry ? geometry.xy[active] : null;
  const focusPoint = active != null ? points[active] : null;

  return (
    <View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => pick(event.nativeEvent.locationX)}
        onResponderMove={(event) => pick(event.nativeEvent.locationX)}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
        style={{ height }}
      >
        {geometry ? (
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              <LinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.14} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {geometry.ticks.map((tick) => (
              <Line
                key={tick.kg}
                x1={PAD.left}
                x2={width - PAD.right + 6}
                y1={tick.y}
                y2={tick.y}
                stroke={colors.hairline}
                strokeWidth={1}
              />
            ))}
            {geometry.goalY != null ? (
              <Line
                x1={PAD.left}
                x2={width - PAD.right + 6}
                y1={geometry.goalY}
                y2={geometry.goalY}
                stroke={colors.textTertiary}
                strokeWidth={1.5}
              />
            ) : null}
            <Path d={geometry.area} fill="url(#wash)" />
            {geometry.xy.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.scaleY} r={3} fill={colors.fillStrong} />
            ))}
            <Path
              d={geometry.line}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {focus ? (
              <>
                <Line
                  x1={focus.x}
                  x2={focus.x}
                  y1={PAD.top}
                  y2={geometry.bottom}
                  stroke={colors.textSecondary}
                  strokeWidth={1}
                />
                <Circle cx={focus.x} cy={focus.scaleY} r={4} fill={colors.textSecondary} />
                <Circle cx={focus.x} cy={focus.trendY} r={6} fill={colors.accent} stroke="#FFF" strokeWidth={2} />
              </>
            ) : (
              <Circle
                cx={geometry.xy[geometry.xy.length - 1].x}
                cy={geometry.xy[geometry.xy.length - 1].trendY}
                r={5}
                fill={colors.accent}
                stroke="#FFF"
                strokeWidth={2}
              />
            )}
          </Svg>
        ) : null}

        {geometry
          ? geometry.ticks.map((tick) => (
              <Text key={tick.kg} style={[styles.tick, { top: tick.y - 8 }]}>
                {tick.kg.toFixed(1)}
              </Text>
            ))
          : null}
        {geometry?.goalY != null ? (
          <Text style={[styles.goal, { top: geometry.goalY - 17 }]}>Goal {goalKg?.toFixed(1)}</Text>
        ) : null}
        {geometry && first && last ? (
          <>
            <Text style={[styles.axis, { left: PAD.left }]}>{shortDate(first.time)}</Text>
            <Text style={[styles.axis, { right: PAD.right - 6 }]}>{shortDate(last.time)}</Text>
          </>
        ) : null}

        {focus && focusPoint ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              { left: Math.min(Math.max(focus.x - 64, 0), Math.max(width - 128, 0)) },
            ]}
          >
            <Text style={styles.tooltipDate}>{shortDate(focusPoint.time)}</Text>
            <Text style={styles.tooltipValue}>{focusPoint.trend.toFixed(1)} kg</Text>
            <Text style={styles.tooltipDate}>Scale {focusPoint.scale.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Trend</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.fillStrong }]} />
          <Text style={styles.legendText}>Scale</Text>
        </View>
        <Text style={[styles.legendText, styles.legendHint]}>Drag to read a day</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tick: {
    ...typography.caption,
    position: 'absolute',
    right: 0,
    width: PAD.right - 8,
    textAlign: 'right',
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  goal: {
    ...typography.caption,
    position: 'absolute',
    left: PAD.left,
    color: colors.textSecondary,
  },
  axis: {
    ...typography.caption,
    position: 'absolute',
    bottom: 0,
    color: colors.textTertiary,
  },
  tooltip: {
    position: 'absolute',
    top: -6,
    width: 128,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadow.raised,
  },
  tooltipDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tooltipValue: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm + 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 1.5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  legendHint: {
    marginLeft: 'auto',
    color: colors.textTertiary,
  },
});
