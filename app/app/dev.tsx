import { useEffect } from 'react';
import { router, useLocalSearchParams, useRootNavigationState, type Href } from 'expo-router';
import { useDevScrollStore } from '../src/dev/devScroll';
import { clearAllData, seedSampleData, stageSampleReview, whenStoresHydrated } from '../src/dev/sampleData';

/**
 * Development-only deep link for driving the simulator, e.g.
 *   exp://127.0.0.1:8081/--/dev?seed=1&go=/plan&y=400
 *   exp://127.0.0.1:8081/--/dev?review=1
 * In a production build it just goes to Today.
 *
 * It has to work two ways: opened over a running app (tabs, maybe a sheet,
 * underneath) and as the cold-start route, when it is the only screen.
 * Expo Go reopens the last deep link on reload, so the cold start is common.
 */
export default function DevRoute() {
  const params = useLocalSearchParams<{
    seed?: string;
    clear?: string;
    go?: string;
    y?: string;
    review?: string;
  }>();
  const navigationReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (!navigationReady) return;
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    void run();
  }, [navigationReady, params.clear, params.go, params.review, params.seed, params.y]);

  async function run() {
    // Persisted stores rehydrate asynchronously; seeding before that finishes gets overwritten.
    await whenStoresHydrated();
    if (params.clear) clearAllData();
    if (params.seed) seedSampleData();

    const go = (params.go ?? '/') as Href;
    if (router.canDismiss()) {
      // Opened over the running app: unwind to the tabs (closing any sheet)
      // so there is one copy of each screen, then switch tab.
      router.dismissAll();
      router.navigate(go);
    } else {
      // Cold start: this route is the only screen, so swap it for the tabs.
      // A freshly created tab navigator opens on its first tab, so pick the
      // requested tab once it has mounted.
      router.replace(go);
      setTimeout(() => router.navigate(go), 300);
    }

    if (params.y) {
      const screen = String(params.go ?? '/').replace(/^\//, '') || 'today';
      useDevScrollStore.getState().set(screen, Number(params.y));
    }
    if (params.review) {
      stageSampleReview();
      setTimeout(() => router.push('/review'), 500);
    }
  }

  return null;
}
