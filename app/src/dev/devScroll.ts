import { useEffect, useRef } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { create } from 'zustand';

/**
 * Development only. Lets the `/dev?go=…&y=…` deep link scroll a tab to an
 * offset, so screenshots of a simulator can reach content below the fold
 * without anyone touching it. Does nothing in production builds.
 */
interface DevScrollState {
  targets: Record<string, number>;
  set: (screen: string, y: number) => void;
  take: (screen: string) => void;
}

export const useDevScrollStore = create<DevScrollState>((set) => ({
  targets: {},
  set: (screen, y) => set((state) => ({ targets: { ...state.targets, [screen]: y } })),
  take: (screen) =>
    set((state) => {
      const { [screen]: _taken, ...rest } = state.targets;
      return { targets: rest };
    }),
}));

export function useDevAutoScroll(screen: string) {
  const ref = useRef<ScrollViewInstance>(null);
  const target = useDevScrollStore((s) => s.targets[screen]);

  useEffect(() => {
    if (!__DEV__ || target == null) return;
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: target, animated: false });
      useDevScrollStore.getState().take(screen);
    }, 1200);
    return () => clearTimeout(timer);
  }, [screen, target]);

  return ref;
}
