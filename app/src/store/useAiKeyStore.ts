import { create } from 'zustand';
import {
  AI_PROVIDERS,
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

const ALL = AI_PROVIDERS.map((item) => item.id);
const byProvider = <T,>(value: (provider: AiProvider) => T) =>
  Object.fromEntries(ALL.map((provider) => [provider, value(provider)])) as Record<AiProvider, T>;

interface AiKeyState {
  hydrated: boolean;
  /** The main provider, asked first. */
  provider: AiProvider;
  /** The main provider's model. */
  model: string;
  /** The main provider has a saved key. */
  hasKey: boolean;
  /** Which providers have a saved key, so backups can be offered. */
  keys: Record<AiProvider, boolean>;
  /** Each provider's chosen model. */
  models: Record<AiProvider, string>;
  hydrate: () => Promise<void>;
  selectProvider: (provider: AiProvider) => Promise<void>;
  selectModel: (model: string, provider?: AiProvider) => Promise<void>;
  saveKey: (apiKey: string) => Promise<void>;
  clearKey: () => Promise<void>;
}

export const useAiKeyStore = create<AiKeyState>((set, get) => ({
  hydrated: false,
  provider: 'gemini',
  model: defaultModel('gemini'),
  hasKey: false,
  keys: byProvider(() => false),
  models: byProvider(defaultModel),

  hydrate: async () => {
    const provider = await readAiProvider();
    const keyList = await Promise.all(ALL.map((item) => readAiKey(item)));
    const modelList = await Promise.all(ALL.map((item) => readAiModel(item)));
    const keys = byProvider((item) => Boolean(keyList[ALL.indexOf(item)]));
    const models = byProvider((item) => modelList[ALL.indexOf(item)]);
    set({ hydrated: true, provider, model: models[provider], hasKey: keys[provider], keys, models });
  },

  selectProvider: async (provider) => {
    await writeAiProvider(provider);
    const [model, apiKey] = await Promise.all([readAiModel(provider), readAiKey(provider)]);
    set((state) => ({
      provider,
      model,
      hasKey: Boolean(apiKey),
      keys: { ...state.keys, [provider]: Boolean(apiKey) },
      models: { ...state.models, [provider]: model },
    }));
  },

  selectModel: async (model, provider = get().provider) => {
    await writeAiModel(provider, model);
    set((state) => ({
      models: { ...state.models, [provider]: model },
      ...(provider === state.provider ? { model } : {}),
    }));
  },

  saveKey: async (apiKey) => {
    const provider = get().provider;
    await writeAiKey(provider, apiKey);
    set((state) => ({ hasKey: true, provider, keys: { ...state.keys, [provider]: true } }));
  },

  clearKey: async () => {
    const provider = get().provider;
    await deleteAiKey(provider);
    set((state) => ({ hasKey: false, keys: { ...state.keys, [provider]: false } }));
  },
}));
