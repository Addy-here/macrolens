import { useEffect } from 'react';
import { router, useLocalSearchParams, useRootNavigationState, type Href } from 'expo-router';
import { runDevCommand, type DevParams } from '../src/dev/devCommands';

/**
 * Development-only deep link for driving the simulator, e.g.
 *   exp://127.0.0.1:8081/--/dev?seed=1&go=/plan&y=400
 * In a dev build, use the DevBridge instead (see src/dev/devCommands.ts).
 * In a production build it just goes to Today.
 *
 * It has to work two ways: opened over a running app, and as the cold-start
 * route when it is the only screen (Expo Go reopens the last link on reload).
 */
export default function DevRoute() {
  const params = useLocalSearchParams<DevParams>();
  const navigationReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (!navigationReady) return;
    const go = (params.go ?? '/') as Href;
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    if (router.canDismiss()) {
      void runDevCommand({ ...params, go: String(go) });
    } else {
      // Cold start: this route is the only screen, so swap it for the tabs first.
      router.replace(go);
      setTimeout(() => void runDevCommand({ ...params, go: String(go) }), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationReady, params.clear, params.go, params.review, params.seed, params.y, params.action]);

  return null;
}
