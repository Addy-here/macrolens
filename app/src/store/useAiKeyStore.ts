import { create } from 'zustand';
import {
  defaultModel,
  deleteAiKey,
  readAiKey,
  readAiModel,
  readAiProvider,
  writeAiKey,
  writeAiModel,
  writeAiProvider,
  type AiProvider,
} from '../services/aiKey';

interface AiKeyState {
  hydrated: boolean;
  provider: AiProvider;
  model: string;
  hasKey: boolean;
  hydrate: () => Promise<void>;
  selectProvider: (provider: AiProvider) => Promise<void>;
  selectModel: (model: string) => Promise<void>;
  saveKey: (apiKey: string) => Promise<void>;
  clearKey: () => Promise<void>;
}

export const useAiKeyStore = create<AiKeyState>((set, get) => ({
  hydrated: false,
  provider: 'gemini',
  model: defaultModel('gemini'),
  hasKey: false,

  hydrate: async () => {
    const provider = await readAiProvider();
    const [model, apiKey] = await Promise.all([readAiModel(provider), readAiKey(provider)]);
    set({ hydrated: true, provider, model, hasKey: Boolean(apiKey) });
  },

  selectProvider: async (provider) => {
    await writeAiProvider(provider);
    const [model, apiKey] = await Promise.all([readAiModel(provider), readAiKey(provider)]);
    set({ provider, model, hasKey: Boolean(apiKey) });
  },

  selectModel: async (model) => {
    const provider = get().provider;
    await writeAiModel(provider, model);
    set({ model });
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
