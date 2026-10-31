import type { ViewStyle } from 'react-native';
import { colors } from './colors';

/**
 * What a touch looks like. One of three, chosen by the shape of the control:
 * - `row`: a list row that runs edge to edge in a card — the gray fill iOS
 *   Settings uses. The card clips it to its rounded corners.
 * - `dim`: text buttons, icons, small circular controls — the iOS text-button dim.
 * - `tile`: large tiles and capsule buttons — a slight dim and press-in.
 */
export const press: Record<'row' | 'dim' | 'tile', ViewStyle> = {
  row: { backgroundColor: colors.fill },
  dim: { opacity: 0.4 },
  tile: { opacity: 0.85, transform: [{ scale: 0.97 }] },
};
