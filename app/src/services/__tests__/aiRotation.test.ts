/// <reference types="jest" />
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../aiKey', () => {
  const actual = jest.requireActual('../aiKey');
  return { ...actual, readSelectedAiKey: jest.fn(), readAiKey: jest.fn(), readAiModel: jest.fn() };
});

import { readAiKey, readAiModel, readSelectedAiKey, type AiProvider } from '../aiKey';
import { parseModelList, useAiModelsStore } from '../aiModels';
import { analyzeFoodPhoto, estimateFromText, resetModelRest, VisionError } from '../visionApi';
import { useToastStore } from '../../store/useToastStore';

const ITEMS = JSON.stringify({ items: [{ name: 'Rice', portionGrams: 150, calories: 200, proteinG: 4, carbsG: 44, fatG: 0.5 }] });

/** The keychain: which providers have a key, each provider's model, and the main one. */
function keychain(main: AiProvider, setup: Partial<Record<AiProvider, { key: string; model: string }>>) {
  (readSelectedAiKey as jest.Mock).mockResolvedValue({ provider: main, model: setup[main]!.model, apiKey: setup[main]!.key });
  (readAiKey as jest.Mock).mockImplementation(async (provider: AiProvider) => setup[provider]?.key ?? null);
  (readAiModel as jest.Mock).mockImplementation(async (provider: AiProvider) => setup[provider]?.model ?? 'default');
}

function providerOf(url: string): AiProvider {
  if (url.includes('generativelanguage')) return 'gemini';
  if (url.includes('openrouter')) return 'openrouter';
  if (url.includes('anthropic')) return 'anthropic';
  return 'openai';
}

/** Answers per "provider:model": a status, or 200 with the estimate. Returns the calls in order. */
function answers(statuses: Record<string, number | 'error-body'>) {
  const calls: string[] = [];
  globalThis.fetch = jest.fn(async (url: string, init: { body: string }) => {
    const provider = providerOf(String(url));
    const body = JSON.parse(init.body);
    const model = body.model ?? String(url).match(/models\/([^:]+):/)?.[1];
    const key = `${provider}:${model}`;
    calls.push(key);
    const status = statuses[key] ?? 200;
    if (status === 'error-body') {
      return { ok: true, status: 200, json: async () => ({ error: { code: 429, message: 'Rate limit exceeded upstream' } }) };
    }
    if (status !== 200) return { ok: false, status, text: async () => 'no' };
    if (provider === 'gemini') {
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: ITEMS }] } }] }) };
    }
    if (provider === 'anthropic') return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: ITEMS }] }) };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: ITEMS } }] }) };
  }) as unknown as typeof fetch;
  return calls;
}

const SETUP = {
  gemini: { key: 'g', model: 'gemini-3.5-flash' },
  openrouter: { key: 'sk-or', model: 'anthropic/claude-haiku-5.5' },
  anthropic: { key: 'sk-ant', model: 'claude-haiku-5-5' },
};

beforeEach(() => {
  resetModelRest();
  useToastStore.setState({ toast: null });
  useAiModelsStore.setState({ catalogs: {}, fallbacks: undefined, excludedFallbacks: [], autoSwitch: true });
  keychain('gemini', SETUP);
});

describe('switching providers', () => {
  it('uses the main provider when it answers', async () => {
    const calls = answers({});
    const result = await estimateFromText('rice');
    expect(calls).toEqual(['gemini:gemini-3.5-flash']);
    expect(result.notice).toBeUndefined();
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('moves to the next provider with its own model, never another model of the same provider', async () => {
    const calls = answers({ 'gemini:gemini-3.5-flash': 429 });
    const result = await estimateFromText('rice');
    expect(calls).toEqual(['gemini:gemini-3.5-flash', 'anthropic:claude-haiku-5-5']);
    expect(calls.filter((call) => call.startsWith('gemini:'))).toHaveLength(1);
    expect(result.items[0].name).toBe('Rice');
    expect(result.notice).toBe('Gemini wasn’t available, so Anthropic’s Claude Haiku estimated this.');
    expect(useToastStore.getState().toast?.message).toBe('Switched to Anthropic');
  });

  it('follows the person’s order and skips providers they removed or have no key for', async () => {
    useAiModelsStore.setState({ fallbacks: ['openrouter', 'anthropic'], excludedFallbacks: ['anthropic'] });
    const calls = answers({ 'gemini:gemini-3.5-flash': 503 });
    const result = await estimateFromText('rice');
    expect(calls).toEqual(['gemini:gemini-3.5-flash', 'openrouter:anthropic/claude-haiku-5.5']);
    expect(calls.some((call) => call.startsWith('openai:'))).toBe(false);
    expect(result.notice).toBe('Gemini wasn’t available, so OpenRouter’s Claude Haiku 5.5 estimated this.');
  });

  it('goes straight to a backup while the main model rests, and still says so', async () => {
    answers({ 'gemini:gemini-3.5-flash': 503 });
    await estimateFromText('rice');
    const calls = answers({});
    const result = await analyzeFoodPhoto({ base64: 'x', mimeType: 'image/jpeg' });
    expect(calls).toEqual(['anthropic:claude-haiku-5-5']);
    expect(result.notice).toBe('Gemini wasn’t available, so Anthropic’s Claude Haiku estimated this.');
  });

  it('treats an error inside a 200 as the provider being unavailable', async () => {
    keychain('openrouter', SETUP);
    const calls = answers({ 'openrouter:anthropic/claude-haiku-5.5': 'error-body' });
    const result = await estimateFromText('rice');
    expect(calls).toEqual(['openrouter:anthropic/claude-haiku-5.5', 'gemini:gemini-3.5-flash']);
    expect(result.notice).toBe('OpenRouter wasn’t available, so Gemini 3.5 Flash estimated this.');
  });

  it('stops at the main provider’s rejected key: that’s the person’s to fix', async () => {
    const calls = answers({ 'gemini:gemini-3.5-flash': 401 });
    await expect(estimateFromText('rice')).rejects.toThrow('That API key was rejected');
    expect(calls).toHaveLength(1);
  });

  it('passes over a backup whose own key fails', async () => {
    const calls = answers({ 'gemini:gemini-3.5-flash': 429, 'anthropic:claude-haiku-5-5': 401 });
    const result = await estimateFromText('rice');
    expect(calls).toEqual(['gemini:gemini-3.5-flash', 'anthropic:claude-haiku-5-5', 'openrouter:anthropic/claude-haiku-5.5']);
    expect(result.notice).toContain('so OpenRouter’s Claude Haiku 5.5 estimated this');
  });

  it('names every provider when none can answer', async () => {
    answers({ 'gemini:gemini-3.5-flash': 429, 'anthropic:claude-haiku-5-5': 529, 'openrouter:anthropic/claude-haiku-5.5': 402 });
    await expect(estimateFromText('rice')).rejects.toThrow('Gemini, Anthropic and OpenRouter can’t answer right now');
  });

  it('asks for another provider’s key when there is no backup', async () => {
    keychain('gemini', { gemini: SETUP.gemini });
    answers({ 'gemini:gemini-3.5-flash': 429 });
    await expect(estimateFromText('rice')).rejects.toThrow('Save a key for another provider in Settings');
  });

  it('never switches when switching is off', async () => {
    useAiModelsStore.setState({ autoSwitch: false });
    const calls = answers({ 'gemini:gemini-3.5-flash': 429 });
    await expect(estimateFromText('rice')).rejects.toBeInstanceOf(VisionError);
    expect(calls).toEqual(['gemini:gemini-3.5-flash']);
  });
});

it('sends OpenRouter requests in its OpenAI-style format with JSON mode where the model supports it', async () => {
  keychain('openrouter', { openrouter: { key: 'sk-or', model: 'openai/gpt-6-luna' } });
  useAiModelsStore.setState({
    catalogs: { openrouter: { fetchedAt: Date.now(), models: [{ id: 'openai/gpt-6-luna', name: 'GPT-6 Luna', json: true }] } },
  });
  answers({});
  await analyzeFoodPhoto({ base64: 'abc', mimeType: 'image/jpeg' });
  const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
  const body = JSON.parse(init.body);
  expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  expect(init.headers.Authorization).toBe('Bearer sk-or');
  expect(body.response_format).toEqual({ type: 'json_object' });
  expect(body.messages[0].content[1].image_url.url).toBe('data:image/jpeg;base64,abc');
});

describe('model lists', () => {
  it('lists OpenRouter models that read images and answer in text, without batch variants', () => {
    const models = parseModelList('openrouter', {
      data: [
        { id: 'anthropic/claude-haiku-5.5', name: 'Anthropic: Claude Haiku 5.5', created: 2, pricing: { prompt: '0.0000001' }, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] }, supported_parameters: ['response_format'] },
        { id: 'anthropic/claude-haiku-5.5:batch', name: 'Anthropic: Claude Haiku 5.5 (batch)', architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } },
        { id: 'google/gemini-nano-banana-2.1', name: 'Google: Nano Banana 2.1', architecture: { input_modalities: ['text', 'image'], output_modalities: ['image', 'text'] } },
        { id: 'deepseek/deepseek-v4', name: 'DeepSeek: V4', architecture: { input_modalities: ['text'], output_modalities: ['text'] } },
        { id: 'google/gemma-4-31b-it:free', name: 'Google: Gemma 4 31B (free)', created: 1, pricing: { prompt: '0' }, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } },
      ],
    });
    expect(models.map((model) => model.id)).toEqual(['anthropic/claude-haiku-5.5', 'google/gemma-4-31b-it:free']);
    expect(models[0]).toMatchObject({ name: 'Claude Haiku 5.5', vendor: 'Anthropic', json: true, free: false });
    expect(models[0].pricePerMillion).toBeCloseTo(0.1);
    expect(models[1]).toMatchObject({ vendor: 'Google', free: true });
  });

  it('keeps Gemini models that generate content and drops embeddings and image models', () => {
    const models = parseModelList('gemini', {
      models: [
        { name: 'models/gemini-4-argon', displayName: 'Gemini 4 Argon', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-embedding-2', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-3.1-flash-image', displayName: 'Nano Banana', supportedGenerationMethods: ['generateContent'] },
      ],
    });
    expect(models.map((model) => model.id)).toEqual(['gemini-4-argon']);
  });
});
