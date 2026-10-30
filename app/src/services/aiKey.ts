import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * The user's own provider key, kept in the iOS keychain (SecureStore).
 * Macrolens never ships a key of its own. See the BYOK ADR in
 * docs/DECISIONS.md.
 */
export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export const AI_PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: 'gemini', label: 'Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
];

export const AI_MODELS: Record<AiProvider, { id: string; label: string }[]> = {
  gemini: [
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
  openai: [
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
  ],
  anthropic: [{ id: 'claude-haiku-5-5', label: 'Claude Haiku' }],
};

const PROVIDER_KEY = 'macrolens.ai.provider';

function keyFor(provider: AiProvider) {
  return `macrolens.ai.key.${provider}`;
}

function modelKey(provider: AiProvider) {
  return `macrolens.ai.model.${provider}`;
}

function isProvider(value: string | null): value is AiProvider {
  return value === 'gemini' || value === 'openai' || value === 'anthropic';
}

export function providerLabel(provider: AiProvider) {
  return AI_PROVIDERS.find((item) => item.id === provider)?.label ?? provider;
}

export function defaultModel(provider: AiProvider) {
  return AI_MODELS[provider][0].id;
}

export function modelLabel(provider: AiProvider, model: string) {
  return AI_MODELS[provider].find((item) => item.id === model)?.label ?? model;
}

async function secureStoreAvailable() {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function readAiProvider(): Promise<AiProvider> {
  if (!(await secureStoreAvailable())) return 'gemini';
  const stored = await SecureStore.getItemAsync(PROVIDER_KEY);
  return isProvider(stored) ? stored : 'gemini';
}

export async function writeAiProvider(provider: AiProvider) {
  if (!(await secureStoreAvailable())) {
    throw new Error('API keys can be saved on iPhone, in the keychain.');
  }
  await SecureStore.setItemAsync(PROVIDER_KEY, provider);
}

export async function readAiModel(provider: AiProvider): Promise<string> {
  const fallback = defaultModel(provider);
  if (!(await secureStoreAvailable())) return fallback;
  const stored = await SecureStore.getItemAsync(modelKey(provider));
  return AI_MODELS[provider].some((item) => item.id === stored) ? (stored as string) : fallback;
}

export async function writeAiModel(provider: AiProvider, model: string) {
  if (!(await secureStoreAvailable())) {
    throw new Error('API keys can be saved on iPhone, in the keychain.');
  }
  if (!AI_MODELS[provider].some((item) => item.id === model)) return;
  await SecureStore.setItemAsync(modelKey(provider), model);
}

export async function readAiKey(provider: AiProvider): Promise<string | null> {
  if (!(await secureStoreAvailable())) return null;
  const value = await SecureStore.getItemAsync(keyFor(provider));
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function writeAiKey(provider: AiProvider, apiKey: string) {
  if (!(await secureStoreAvailable())) {
    throw new Error('API keys can be saved on iPhone, in the keychain.');
  }
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('Paste a key first.');
  await SecureStore.setItemAsync(keyFor(provider), trimmed);
  await SecureStore.setItemAsync(PROVIDER_KEY, provider);
}

export async function deleteAiKey(provider: AiProvider) {
  if (!(await secureStoreAvailable())) return;
  await SecureStore.deleteItemAsync(keyFor(provider));
}

export async function readSelectedAiKey(): Promise<{
  provider: AiProvider;
  model: string;
  apiKey: string;
} | null> {
  const provider = await readAiProvider();
  const apiKey = await readAiKey(provider);
  if (!apiKey) return null;
  return { provider, model: await readAiModel(provider), apiKey };
}
