import { create } from 'zustand';
import {
  deleteAiKey,
  readAiKey,
  readAiProvider,
  writeAiKey,
  writeAiProvider,
  type AiProvider,
} from '../services/aiKey';

interface AiKeyState {
  hydrated: boolean;
  provider: AiProvider;
  hasKey: boolean;
  hydrate: () => Promise<void>;
  selectProvider: (provider: AiProvider) => Promise<void>;
  saveKey: (apiKey: string) => Promise<void>;
  clearKey: () => Promise<void>;
}

export const useAiKeyStore = create<AiKeyState>((set, get) => ({
  hydrated: false,
  provider: 'openai',
  hasKey: false,

  hydrate: async () => {
    const provider = await readAiProvider();
    const apiKey = await readAiKey(provider);
    set({ hydrated: true, provider, hasKey: Boolean(apiKey) });
  },

  selectProvider: async (provider) => {
    await writeAiProvider(provider);
    const apiKey = await readAiKey(provider);
    set({ provider, hasKey: Boolean(apiKey) });
  },

  saveKey: async (apiKey) => {
    const provider = get().provider;
    await writeAiKey(provider, apiKey);
    set({ hasKey: true, provider });
  },

  clearKey: async () => {
    await deleteAiKey(get().provider);
    set({ hasKey: false });
  },
}));
