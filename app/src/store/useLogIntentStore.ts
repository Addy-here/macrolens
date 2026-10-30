import { create } from 'zustand';

export type LogIntent =
  | { kind: 'listen' }
  | { kind: 'capture'; source: 'camera' | 'library' }
  /** Development: prefill the description, or transcribe an audio file instead of the mic. */
  | { kind: 'text'; text: string }
  | { kind: 'speak'; fileUri: string };

interface LogIntentState {
  intent: (LogIntent & { id: number }) | null;
  request: (intent: LogIntent) => void;
  take: (id: number) => void;
}

let next = 0;

/**
 * A one-shot request for the Log screen ("start listening", "open the
 * camera"), left by the quick-log bar on any tab. Route params aren't used
 * for this: navigating to a tab that's already open doesn't reliably replace
 * them, so the second tap would do nothing.
 */
export const useLogIntentStore = create<LogIntentState>((set) => ({
  intent: null,
  request: (intent) => set({ intent: { ...intent, id: ++next } }),
  take: (id) => set((state) => (state.intent?.id === id ? { intent: null } : {})),
}));
