import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AI_MODELS, AI_PROVIDERS, readAiKey, type AiProvider } from './aiKey';

/**
 * Each provider's models, fetched live so nobody has to know a model's name,
 * plus the backup providers to switch to when the main one can't answer.
 * Switching is only ever between providers, each with its own chosen model —
 * never to another model of the same provider. Only models that read images
 * and answer in text are listed: photo estimates need both. Nothing here is
 * secret, so it lives in AsyncStorage, not the keychain.
 */

export interface ModelInfo {
  id: string;
  name: string;
  /** Who makes it, for OpenRouter ("Anthropic"). */
  vendor?: string;
  /** US dollars per million input tokens, when the provider says. */
  pricePerMillion?: number;
  free?: boolean;
  /** Accepts `response_format: json_object` (OpenRouter tells us per model). */
  json?: boolean;
  created?: number;
}

export interface Catalog {
  models: ModelInfo[];
  fetchedAt: number;
}

interface AiModelsState {
  catalogs: Partial<Record<AiProvider, Catalog>>;
  /** Backup providers in the order to try them; providers not listed follow in the usual order. */
  fallbacks?: AiProvider[];
  /** Providers taken off the backup list, even when they have a key. */
  excludedFallbacks: AiProvider[];
  /** Try the backup providers when the main one is rate-limited or unavailable. */
  autoSwitch: boolean;
  setCatalog: (provider: AiProvider, catalog: Catalog) => void;
  setFallbacks: (providers: AiProvider[]) => void;
  setExcludedFallbacks: (providers: AiProvider[]) => void;
  setAutoSwitch: (on: boolean) => void;
}

export const useAiModelsStore = create<AiModelsState>()(
  persist(
    (set) => ({
      catalogs: {},
      fallbacks: undefined,
      excludedFallbacks: [],
      autoSwitch: true,
      setCatalog: (provider, catalog) => set((state) => ({ catalogs: { ...state.catalogs, [provider]: catalog } })),
      setFallbacks: (fallbacks) => set({ fallbacks }),
      setExcludedFallbacks: (excludedFallbacks) => set({ excludedFallbacks }),
      setAutoSwitch: (autoSwitch) => set({ autoSwitch }),
    }),
    {
      name: 'macrolens-ai-models',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        catalogs: state.catalogs,
        fallbacks: state.fallbacks,
        excludedFallbacks: state.excludedFallbacks,
        autoSwitch: state.autoSwitch,
      }),
    },
  ),
);

const STALE_MS = 24 * 60 * 60 * 1000;

export function modelsFor(provider: AiProvider): ModelInfo[] {
  const fetched = useAiModelsStore.getState().catalogs[provider]?.models;
  return fetched?.length ? fetched : AI_MODELS[provider].map((model) => ({ id: model.id, name: model.label }));
}

export function modelInfo(provider: AiProvider, id: string): ModelInfo | undefined {
  return (
    useAiModelsStore.getState().catalogs[provider]?.models.find((model) => model.id === id) ??
    AI_MODELS[provider].map((model) => ({ id: model.id, name: model.label })).find((model) => model.id === id)
  );
}

/** "Claude Haiku 5.5" — the provider's own name for a model, or a tidied id. */
export function modelName(provider: AiProvider, id: string) {
  return modelInfo(provider, id)?.name ?? prettifyId(id);
}

export function prettifyId(id: string) {
  const last = id.split('/').pop() ?? id;
  return last
    .replace(/:free$/, ' (free)')
    .split('-')
    .map((part) => (/^(gpt|ai)$/i.test(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ')
    .replace(/^GPT /, 'GPT-');
}

/**
 * The backup providers to try after `primary`, in order: the person's order,
 * then any provider they haven't placed (so a newly saved key joins at the
 * end), minus the ones they removed. A provider without a key is never tried,
 * and the main provider is never its own backup.
 */
export function fallbackProviders(primary: AiProvider, keys: Partial<Record<AiProvider, boolean>>): AiProvider[] {
  const { fallbacks = [], excludedFallbacks } = useAiModelsStore.getState();
  const order = [...fallbacks, ...AI_PROVIDERS.map((item) => item.id).filter((id) => !fallbacks.includes(id))];
  return order.filter((provider) => provider !== primary && keys[provider] && !excludedFallbacks.includes(provider));
}

export function catalogIsStale(provider: AiProvider) {
  const catalog = useAiModelsStore.getState().catalogs[provider];
  return !catalog || Date.now() - catalog.fetchedAt > STALE_MS;
}

export class ModelListError extends Error {}

/**
 * Fetches the provider's models and caches them. OpenRouter's list is public;
 * the others need the saved key, and without one the starting list stands.
 */
export async function refreshModels(provider: AiProvider): Promise<ModelInfo[]> {
  const apiKey = provider === 'openrouter' ? null : await readAiKey(provider);
  if (provider !== 'openrouter' && !apiKey) return modelsFor(provider);
  const models = await fetchModels(provider, apiKey);
  if (models.length === 0) throw new ModelListError('No models came back. Try again.');
  useAiModelsStore.getState().setCatalog(provider, { models, fetchedAt: Date.now() });
  return models;
}

async function fetchModels(provider: AiProvider, apiKey: string | null): Promise<ModelInfo[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const request = listRequest(provider, apiKey);
    const response = await fetch(request.url, { headers: request.headers, signal: controller.signal });
    if (response.status === 401 || response.status === 403) throw new ModelListError('That API key was rejected. Check it below.');
    if (!response.ok) throw new ModelListError(`Couldn’t load models (${response.status}). Try again.`);
    return parseModelList(provider, await response.json());
  } catch (error) {
    if (error instanceof ModelListError) throw error;
    throw new ModelListError('Couldn’t reach the provider. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

function listRequest(provider: AiProvider, apiKey: string | null): { url: string; headers: Record<string, string> } {
  if (provider === 'openrouter') return { url: 'https://openrouter.ai/api/v1/models', headers: {} };
  if (provider === 'openai') return { url: 'https://api.openai.com/v1/models', headers: { Authorization: `Bearer ${apiKey}` } };
  if (provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/models?limit=100',
      headers: { 'x-api-key': apiKey ?? '', 'anthropic-version': '2023-06-01' },
    };
  }
  return {
    url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
    headers: { 'x-goog-api-key': apiKey ?? '' },
  };
}

const VENDOR_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Google',
  anthropic: 'Anthropic',
  'meta-llama': 'Meta',
  meta: 'Meta',
  mistralai: 'Mistral',
  'x-ai': 'xAI',
  qwen: 'Qwen',
};

/** Turns each provider's list into vision models that answer in text, newest first. */
export function parseModelList(provider: AiProvider, data: unknown): ModelInfo[] {
  const list = (data as { data?: unknown[]; models?: unknown[] })?.data ?? (data as { models?: unknown[] })?.models ?? [];
  const models: ModelInfo[] = [];
  for (const raw of list as Record<string, unknown>[]) {
    if (provider === 'openrouter') {
      const id = String(raw.id ?? '');
      const arch = (raw.architecture ?? {}) as { input_modalities?: string[]; output_modalities?: string[] };
      const output = arch.output_modalities ?? [];
      // Batch-only variants can't answer right away; image generators answer in pictures.
      if (!id || id.endsWith(':batch')) continue;
      if (!arch.input_modalities?.includes('image') || output.length !== 1 || output[0] !== 'text') continue;
      const endpoints = raw.endpoints as string[] | undefined;
      if (endpoints && !endpoints.includes('/api/v1/chat/completions')) continue;
      const vendorKey = id.split('/')[0].replace(/^~/, '');
      const fullName = String(raw.name ?? id);
      const price = parseFloat(String((raw.pricing as { prompt?: string })?.prompt ?? ''));
      models.push({
        id,
        name: fullName.includes(': ') ? fullName.slice(fullName.indexOf(': ') + 2) : fullName,
        vendor: VENDOR_NAMES[vendorKey] ?? (fullName.includes(': ') ? fullName.split(': ')[0] : vendorKey),
        pricePerMillion: Number.isFinite(price) ? price * 1_000_000 : undefined,
        free: id.endsWith(':free') || price === 0,
        json: ((raw.supported_parameters as string[] | undefined) ?? []).includes('response_format'),
        created: typeof raw.created === 'number' ? raw.created : undefined,
      });
    } else if (provider === 'gemini') {
      const id = String(raw.name ?? '').replace(/^models\//, '');
      const methods = (raw.supportedGenerationMethods as string[] | undefined) ?? [];
      if (!id.startsWith('gemini') || !methods.includes('generateContent')) continue;
      if (/embedding|aqa|tts|image|live|audio|veo|imagen|robotics|computer-use|native/.test(id)) continue;
      models.push({ id, name: String(raw.displayName ?? prettifyId(id)) });
    } else if (provider === 'openai') {
      const id = String(raw.id ?? '');
      if (!/^(gpt-|o\d|chatgpt)/.test(id)) continue;
      if (/audio|realtime|transcribe|tts|search|image|instruct|embedding|moderation|codex|dall-e|whisper|3\.5/.test(id)) continue;
      models.push({ id, name: prettifyId(id), created: typeof raw.created === 'number' ? raw.created : undefined });
    } else {
      const id = String(raw.id ?? '');
      if (!id.startsWith('claude')) continue;
      const created = Date.parse(String(raw.created_at ?? ''));
      models.push({
        id,
        name: String(raw.display_name ?? prettifyId(id)),
        created: Number.isFinite(created) ? created / 1000 : undefined,
      });
    }
  }
  return models.sort((a, b) => (b.created ?? 0) - (a.created ?? 0) || a.name.localeCompare(b.name));
}

/** "$0.83 per 1M tokens", "Free". */
export function priceLabel(model: ModelInfo) {
  if (model.free) return 'Free';
  if (model.pricePerMillion == null) return undefined;
  const value = model.pricePerMillion;
  return `$${value < 10 ? value.toFixed(2) : Math.round(value)} per 1M tokens`;
}
