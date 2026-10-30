import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  /** A short confirmation shows a check; a destructive one doesn't. */
  tone?: 'done' | 'plain';
  action?: { label: string; run: () => void };
}

interface ToastState {
  toast: Toast | null;
  show: (message: string, action?: Toast['action'], tone?: Toast['tone']) => void;
  hide: (id?: number) => void;
}

let next = 0;

/** One short message at a time, above the tab bar — e.g. "Deleted · Undo". */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, action, tone = 'plain') => set({ toast: { id: ++next, message, action, tone } }),
  hide: (id) => set((state) => (id == null || state.toast?.id === id ? { toast: null } : {})),
}));
