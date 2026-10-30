import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

/**
 * The Macrolens mark: a fried egg whose yolk is a lens.
 * Same geometry as the app icon (assets/brand/build.py), on a 1024 grid.
 * `tile` draws it on the orange icon tile, the way it sits on the Home Screen.
 */

const WHITE =
  'M 827.3 422.5 C 854.4 502.4 874.4 624.8 837.5 691.7 C 800.6 758.6 687.6 800.5 606.0 823.8 C 524.4 847.1 415.3 865.9 347.8 831.3 C 280.2 796.8 228.0 697.2 200.6 616.3 C 173.1 535.5 146.9 413.8 183.0 346.4 C 219.0 279.1 334.9 234.8 416.8 212.4 C 498.7 190.0 606.0 177.2 674.4 212.2 C 742.8 247.2 800.1 342.6 827.3 422.5 Z';
const GLINT = 'M 459.1 464.2 A 92 92 0 0 1 516.5 401.5';

export function AppMark({ size = 44, tile = false }: { size?: number; tile?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityElementsHidden importantForAccessibility="no">
      {tile ? <Rect width={1024} height={1024} rx={229} fill={colors.accent} /> : null}
      <Path d={WHITE} fill="#FFFFFF" />
      <Circle cx={548} cy={488} r={140} fill={colors.accent} />
      <Path d={GLINT} fill="none" stroke="#FFFFFF" strokeWidth={30} strokeLinecap="round" />
    </Svg>
  );
}
