import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * The user's own provider key, kept in the iOS keychain (SecureStore).
 * Macrolens never ships a key of its own. See the BYOK ADR in
 * docs/DECISIONS.md.
 */
export type AiProvider = 'openai' | 'anthropic';

export const AI_PROVIDERS: { id: AiProvider; label: string; model: string }[] = [
  { id: 'openai', label: 'OpenAI', model: 'gpt-4.1-mini' },
  { id: 'anthropic', label: 'Anthropic', model: 'claude-haiku-5-5' },
];

const PROVIDER_KEY = 'macrolens.ai.provider';

function keyFor(provider: AiProvider) {
  return `macrolens.ai.key.${provider}`;
}

export function providerLabel(provider: AiProvider) {
  return AI_PROVIDERS.find((item) => item.id === provider)?.label ?? provider;
}

export function providerModel(provider: AiProvider) {
  return AI_PROVIDERS.find((item) => item.id === provider)?.model ?? '';
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
  if (!(await secureStoreAvailable())) return 'openai';
  const stored = await SecureStore.getItemAsync(PROVIDER_KEY);
  return stored === 'anthropic' ? 'anthropic' : 'openai';
}

export async function writeAiProvider(provider: AiProvider) {
  if (!(await secureStoreAvailable())) {
    throw new Error('API keys can be saved on iPhone, in the keychain.');
  }
  await SecureStore.setItemAsync(PROVIDER_KEY, provider);
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
  apiKey: string;
} | null> {
  const provider = await readAiProvider();
  const apiKey = await readAiKey(provider);
  if (!apiKey) return null;
  return { provider, apiKey };
}
