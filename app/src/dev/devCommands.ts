import { router, type Href } from 'expo-router';
import { create } from 'zustand';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useLogIntentStore } from '../store/useLogIntentStore';
import { clearAllData, seedSampleData, stageSampleReview, whenStoresHydrated } from './sampleData';

/**
 * Development only. Drives the app without touching it, for checking work in
 * the simulator. Commands arrive from the `/dev` deep link or, in a dev
 * build where iOS asks before opening every link, from the DevBridge,
 * which reads Documents/dev-command.txt in the app's container:
 *
 *   C=$(xcrun simctl get_app_container booted com.adwaitmahadar.macrolens data)
 *   echo "seed=1&go=/plan&y=400" > "$C/Documents/dev-command.txt"
 *
 * Keys: seed, clear, go (a route, query allowed), y (scroll offset), review
 * (stage a sample review), action (a named handler a screen registered),
 * aikey (1/0: act as if an AI key is saved), say (prefill Log's description),
 * speak (an audio file path for Log to transcribe instead of the mic).
 */

export type DevParams = Partial<Record<'seed' | 'clear' | 'go' | 'y' | 'review' | 'action' | 'aikey' | 'say' | 'speak', string>>;

interface DevState {
  scroll: Record<string, number>;
  /** Named actions a screen exposes while mounted, e.g. "log.review". */
  actions: Record<string, () => void>;
  setScroll: (screen: string, y: number) => void;
  takeScroll: (screen: string) => void;
  register: (name: string, run: () => void) => () => void;
}

export const useDevStore = create<DevState>((set, get) => ({
  scroll: {},
  actions: {},
  setScroll: (screen, y) => set((state) => ({ scroll: { ...state.scroll, [screen]: y } })),
  takeScroll: (screen) =>
    set((state) => {
      const { [screen]: _taken, ...rest } = state.scroll;
      return { scroll: rest };
    }),
  register: (name, run) => {
    set((state) => ({ actions: { ...state.actions, [name]: run } }));
    return () => {
      if (get().actions[name] === run) {
        set((state) => {
          const { [name]: _gone, ...rest } = state.actions;
          return { actions: rest };
        });
      }
    };
  },
}));

export async function runDevCommand(params: DevParams) {
  if (!__DEV__) return;
  // Persisted stores rehydrate asynchronously; seeding before that finishes gets overwritten.
  await whenStoresHydrated();
  if (params.clear) clearAllData();
  // Pretend a key is saved (UI only; real requests fail), to look at the AI paths without a real key.
  if (params.aikey) useAiKeyStore.setState({ hasKey: params.aikey === '1' });
  if (params.seed) seedSampleData();

  if (params.go) {
    const go = params.go as Href;
    if (router.canDismiss()) router.dismissAll();
    router.navigate(go);
    if (params.y) {
      const screen = String(params.go).split('?')[0].replace(/^\//, '') || 'today';
      useDevStore.getState().setScroll(screen, Number(params.y));
    }
  }
  // Prefill Log's description, or feed it an audio file in place of the mic.
  if (params.say != null || params.speak) {
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/log');
    const intent = params.speak ? { kind: 'speak' as const, fileUri: params.speak } : { kind: 'text' as const, text: params.say ?? '' };
    setTimeout(() => useLogIntentStore.getState().request(intent), 400);
  }
  if (params.review) {
    stageSampleReview();
    setTimeout(() => router.push('/review'), 500);
  }
  if (params.action) {
    const name = params.action;
    // Give a screen opened by the same command a moment to mount and register.
    setTimeout(() => useDevStore.getState().actions[name]?.(), params.go ? 900 : 0);
  }
}
