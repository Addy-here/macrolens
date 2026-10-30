import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors } from '../../theme';

/** Orange line for two or more weigh-ins. Fewer points render nothing. */
export function WeightLine({ values }: { values: number[] }) {
  const [width, setWidth] = useState(0);
  const height = 140;

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 12;
  const innerW = Math.max(width - pad * 2, 1);
  const innerH = height - pad * 2;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * innerW;
    const y = pad + (1 - (value - min) / span) * innerH;
    return { x, y };
  });

  return (
    <View
      accessibilityLabel={`Weight from ${min.toFixed(1)} to ${max.toFixed(1)} kilograms`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.box}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Polyline
            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <Circle key={index} cx={point.x} cy={point.y} r={3.5} fill={colors.accent} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 140,
    marginTop: 8,
  },
});
