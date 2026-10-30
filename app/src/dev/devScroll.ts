import { useEffect, useRef } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { useDevStore } from './devCommands';

/**
 * Development only. Lets a dev command scroll a tab to an offset, so
 * screenshots can reach content below the fold. Does nothing in production.
 */
export function useDevAutoScroll(screen: string) {
  const ref = useRef<ScrollViewInstance>(null);
  const target = useDevStore((s) => s.scroll[screen]);

  useEffect(() => {
    if (!__DEV__ || target == null) return;
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: target, animated: false });
      useDevStore.getState().takeScroll(screen);
    }, 1200);
    return () => clearTimeout(timer);
  }, [screen, target]);

  return ref;
}

/** Development only. Exposes a screen action (e.g. "review.confirm") to dev commands while mounted. */
export function useDevAction(name: string, run: () => void) {
  const latest = useRef(run);
  latest.current = run;
  useEffect(() => {
    if (!__DEV__) return;
    return useDevStore.getState().register(name, () => latest.current());
  }, [name]);
}
