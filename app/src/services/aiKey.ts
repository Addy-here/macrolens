import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Starting lists, used until the provider's own list has been fetched (see
 * services/aiModels.ts). Any model id the provider accepts can be chosen.
 *
 * The user's own provider key, kept in the iOS keychain (SecureStore).
 * Macrolens never ships a key of its own. See the BYOK ADR in
 * docs/DECISIONS.md.
 */
export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export const AI_PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: 'gemini', label: 'Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openrouter', label: 'OpenRouter' },
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
  openrouter: [
    { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
    { id: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5' },
    { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini' },
  ],
};

const PROVIDER_KEY = 'macrolens.ai.provider';

function keyFor(provider: AiProvider) {
  return `macrolens.ai.key.${provider}`;
}

function modelKey(provider: AiProvider) {
  return `macrolens.ai.model.${provider}`;
}

function isProvider(value: string | null): value is AiProvider {
  return value === 'gemini' || value === 'openai' || value === 'anthropic' || value === 'openrouter';
}

export function providerLabel(provider: AiProvider) {
  return AI_PROVIDERS.find((item) => item.id === provider)?.label ?? provider;
}

export function defaultModel(provider: AiProvider) {
  return AI_MODELS[provider][0].id;
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
  return stored?.trim() ? stored.trim() : fallback;
}

export async function writeAiModel(provider: AiProvider, model: string) {
  if (!(await secureStoreAvailable())) {
    throw new Error('API keys can be saved on iPhone, in the keychain.');
  }
  if (!model.trim()) return;
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
