import type { FoodItem, Micros } from '../types';
import { createId } from '../utils/id';
import { AI_PROVIDERS, providerLabel, readAiKey, readAiModel, readSelectedAiKey, type AiProvider } from './aiKey';
import { fallbackProviders, modelInfo, modelName, useAiModelsStore } from './aiModels';
import { useToastStore } from '../store/useToastStore';

const PROMPT = `You estimate food in a photo for a nutrition log.
Reply with JSON only, no markdown, in this shape:
{"items":[{"name":"string","portionGrams":number,"calories":number,"proteinG":number,"carbsG":number,"fatG":number,"fiberG":number,"sugarG":number,"sodiumMg":number,"saturatedFatG":number}]}
Rules:
- Include only foods and drinks you can actually see.
- portionGrams is the edible portion, not the whole package unless the whole package is the serving.
- Macros are for that portion, not per 100g.
- If the photo is not food, return {"items":[]}.`;

const TEXT_PROMPT = `You turn a spoken or typed description of a meal into nutrition log items.
Reply with JSON only, no markdown, in this shape:
{"items":[{"name":"string","portionGrams":number,"calories":number,"proteinG":number,"carbsG":number,"fatG":number,"fiberG":number,"sugarG":number,"sodiumMg":number,"saturatedFatG":number}]}
Rules:
- One item per dish, food, or drink actually eaten. A named dish stays one item ("Panda Express orange chicken"), not its ingredients.
- Use the person's words for the name, in sentence case, including a restaurant or brand if they said one, and use that place's published nutrition when you know it.
- Speech-to-text may mis-hear words; read through obvious mistakes.
- Respect stated amounts and units. If none is stated, assume one typical serving.
- portionGrams is the edible portion; for drinks use millilitres as grams.
- Macros are for that portion, not per 100g.
- Ignore words that are not food. If nothing is food, return {"items":[]}.
Description:
`;

type EstimateInput = { kind: 'image'; base64: string; mimeType: string } | { kind: 'text'; text: string };

export class VisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VisionError';
  }
}

/** A model that can't answer right now; the next backup provider is worth trying. */
export type SkipReason = 'rate-limited' | 'busy' | 'unavailable' | 'credits';

class ModelUnavailable extends Error {
  constructor(readonly reason: SkipReason) {
    super(reason);
  }
}

/** Items, and a sentence for the person when a backup provider answered instead of the main one. */
export interface Estimate {
  items: FoodItem[];
  notice?: string;
}

export async function analyzeFoodPhoto(input: { base64: string; mimeType: string }): Promise<Estimate> {
  const { raw, notice } = await estimate({ kind: 'image', ...input }, 'Add your API key in Settings before analyzing a photo.');
  return { items: parseFoodItems(raw), notice };
}

/** A described meal, estimated by the user's chosen provider. Used for foods the on-device reference doesn't know. */
export async function estimateFromText(text: string): Promise<Estimate> {
  const { raw, notice } = await estimate(
    { kind: 'text', text },
    'Add your API key in Settings to estimate foods Macrolens doesn’t know yet.',
  );
  return { items: parseFoodItems(raw, 'text-ai'), notice };
}

/** How long a provider's model that failed is passed over before it's tried first again. */
const REST_MS: Record<SkipReason, number> = {
  'rate-limited': 2 * 60_000,
  busy: 5 * 60_000,
  credits: 30 * 60_000,
  unavailable: 60 * 60_000,
};

const resting = new Map<string, { until: number; reason: SkipReason }>();
const restKey = (provider: AiProvider, model: string) => `${provider}:${model}`;

interface Attempt {
  provider: AiProvider;
  model: string;
  apiKey: string;
}

/** The main provider, then each backup provider that has a saved key — each with its own chosen model. */
async function attempts(): Promise<Attempt[] | null> {
  const main = await readSelectedAiKey();
  if (!main) return null;
  const list: Attempt[] = [main];
  if (!useAiModelsStore.getState().autoSwitch) return list;
  const others = AI_PROVIDERS.map((item) => item.id).filter((provider) => provider !== main.provider);
  const keys = Object.fromEntries(await Promise.all(others.map(async (provider) => [provider, await readAiKey(provider)]))) as Record<
    AiProvider,
    string | null
  >;
  const hasKey = Object.fromEntries(others.map((provider) => [provider, Boolean(keys[provider])])) as Record<AiProvider, boolean>;
  for (const provider of fallbackProviders(main.provider, hasKey)) {
    list.push({ provider, model: await readAiModel(provider), apiKey: keys[provider]! });
  }
  return list;
}

/** "Gemini 3.5 Flash", "OpenRouter’s Claude Haiku 5.5" — the provider is named unless the model already says it. */
function described(attempt: Attempt) {
  const provider = providerLabel(attempt.provider);
  const model = modelName(attempt.provider, attempt.model);
  return model.toLowerCase().startsWith(provider.toLowerCase()) ? model : `${provider}’s ${model}`;
}

/**
 * Asks the main provider's model, and when it's rate-limited, overloaded,
 * gone, or out of credits, each backup provider in turn with that provider's
 * own chosen model and key. It never tries another model of the same
 * provider. A model that just failed rests for a few minutes, so the next
 * estimate goes straight to a provider that works. Whenever a backup answers,
 * a toast says so and the result carries a note for the review sheet.
 */
async function estimate(input: EstimateInput, missingKey: string): Promise<{ raw: string; notice?: string }> {
  const list = await attempts();
  if (!list) throw new VisionError(missingKey);
  const [main] = list;

  const now = Date.now();
  const isResting = (attempt: Attempt) => (resting.get(restKey(attempt.provider, attempt.model))?.until ?? 0) > now;
  const order = [...list.filter((attempt) => !isResting(attempt)), ...list.filter(isResting)];

  for (const attempt of order) {
    try {
      const raw = await requestEstimate(attempt.provider, attempt.model, attempt.apiKey, input);
      resting.delete(restKey(attempt.provider, attempt.model));
      if (attempt === main) return { raw };
      const notice = `${providerLabel(main.provider)} wasn’t available, so ${described(attempt)} estimated this.`;
      useToastStore.getState().show(`Switched to ${providerLabel(attempt.provider)}`);
      return { raw, notice };
    } catch (error) {
      if (!(error instanceof ModelUnavailable)) {
        // A backup's own problem (its key, a bad request) shouldn't hide that the main one was busy; try the next.
        if (attempt !== main && error instanceof VisionError) continue;
        throw error;
      }
      resting.set(restKey(attempt.provider, attempt.model), { until: Date.now() + REST_MS[error.reason], reason: error.reason });
    }
  }

  if (list.length === 1) {
    throw new VisionError(
      useAiModelsStore.getState().autoSwitch
        ? `${providerLabel(main.provider)} isn’t available right now. Save a key for another provider in Settings so Macrolens can switch.`
        : `${providerLabel(main.provider)} isn’t available right now. Turn on switching in Settings, or try again in a minute.`,
    );
  }
  const names = list.map((attempt) => providerLabel(attempt.provider));
  throw new VisionError(`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} can’t answer right now. Try again in a minute.`);
}

/** Forget which models were resting. Tests, and a key change, start fresh. */
export function resetModelRest() {
  resting.clear();
}

async function requestEstimate(
  provider: AiProvider,
  model: string,
  apiKey: string,
  input: EstimateInput,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(endpoint(provider, model), {
      method: 'POST',
      signal: controller.signal,
      headers: headers(provider, apiKey),
      body: JSON.stringify(body(provider, model, input)),
    });

    if (!response.ok) await throwFailure(response);

    const data = await response.json();
    // OpenRouter can answer 200 with the upstream provider's error inside.
    const inner = (data as { error?: { code?: number; message?: string } })?.error;
    if (inner) throwForStatus(Number(inner.code) || 500, String(inner.message ?? ''));
    const text = responseText(provider, data);
    if (typeof text !== 'string' || !text.trim()) {
      throw new VisionError('The model returned an empty estimate.');
    }
    return text;
  } catch (error) {
    if (error instanceof VisionError || error instanceof ModelUnavailable) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new VisionError('The request timed out. Try again.');
    }
    throw new VisionError('Could not reach the AI provider. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

function endpoint(provider: AiProvider, model: string) {
  if (provider === 'openai') return 'https://api.openai.com/v1/chat/completions';
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions';
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function headers(provider: AiProvider, apiKey: string): Record<string, string> {
  if (provider === 'openai') {
    return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  }
  if (provider === 'openrouter') {
    // OpenRouter's app attribution headers; optional, they name the app on the person's activity page.
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/Addy-here/macrolens',
      'X-Title': 'Macrolens',
    };
  }
  if (provider === 'anthropic') {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }
  return { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };
}

function body(provider: AiProvider, model: string, input: EstimateInput) {
  if (input.kind === 'text') return textBody(provider, model, TEXT_PROMPT + input.text);
  if (provider === 'openai' || provider === 'openrouter') {
    return {
      model,
      ...jsonMode(provider, model),
      ...(provider === 'openrouter' ? { max_tokens: 1500 } : {}),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.base64}` } },
          ],
        },
      ],
    };
  }
  if (provider === 'anthropic') {
    return {
      model,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: input.mimeType, data: input.base64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    };
  }
  return {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: input.mimeType, data: input.base64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  };
}

/** JSON mode where it's supported. OpenRouter models differ; the parser copes with prose around the JSON. */
function jsonMode(provider: AiProvider, model: string) {
  if (provider === 'openai') return { response_format: { type: 'json_object' } };
  if (provider === 'openrouter' && modelInfo('openrouter', model)?.json) return { response_format: { type: 'json_object' } };
  return {};
}

function textBody(provider: AiProvider, model: string, prompt: string) {
  if (provider === 'openai' || provider === 'openrouter') {
    return {
      model,
      ...jsonMode(provider, model),
      ...(provider === 'openrouter' ? { max_tokens: 1500 } : {}),
      messages: [{ role: 'user', content: prompt }],
    };
  }
  if (provider === 'anthropic') {
    return { model, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] };
  }
  return { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } };
}

function responseText(provider: AiProvider, data: unknown) {
  if (provider === 'openai' || provider === 'openrouter') {
    const content = (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
    return content;
  }
  if (provider === 'anthropic') return anthropicText(data as { content?: { type?: string; text?: string }[] });
  return geminiText(data);
}

function geminiText(data: unknown) {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]
    ?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part.text ?? '').join('\n');
}

function anthropicText(data: { content?: { type?: string; text?: string }[] }) {
  if (!Array.isArray(data?.content)) return '';
  return data.content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

async function throwFailure(response: Response): Promise<never> {
  let detail = '';
  try {
    detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 300);
  } catch {
    detail = '';
  }
  return throwForStatus(response.status, detail);
}

/**
 * Sorts a failure into "this model can't answer now, try the next provider"
 * or "stop": a rejected key or a bad request is the person's to fix.
 */
export function throwForStatus(status: number, detail: string): never {
  if (status === 401 || status === 403) throw new VisionError('That API key was rejected. Check it in Settings.');
  if (status === 402) throw new ModelUnavailable('credits');
  if (status === 429) throw new ModelUnavailable('rate-limited');
  if (status === 404) throw new ModelUnavailable('unavailable');
  if (status === 400 && /model|endpoint/i.test(detail) && /not found|invalid|not a valid|does not exist|no endpoints|not available|unsupported|deprecated/i.test(detail)) {
    throw new ModelUnavailable('unavailable');
  }
  if (status >= 500) throw new ModelUnavailable('busy');
  const short = detail.slice(0, 160);
  throw new VisionError(short ? `The AI request failed (${status}). ${short}` : `The AI request failed (${status}).`);
}

export function parseFoodItems(raw: string, source: FoodItem['source'] = 'vision-ai'): FoodItem[] {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new VisionError('The model did not return a meal estimate.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new VisionError('The model did not return a meal estimate.');
  }

  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'items' in parsed
      ? (parsed as { items?: unknown }).items
      : null;

  if (!Array.isArray(items) || items.length === 0) {
    throw new VisionError(
      source === 'vision-ai' ? 'No food was recognized. Try a closer photo of the meal.' : 'No food was recognized in that description.',
    );
  }

  return items.slice(0, 12).map((item) => toFoodItem(item, source));
}

function toFoodItem(value: unknown, source: FoodItem['source']): FoodItem {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Food';
  const portionGrams = Math.max(1, Math.round(num(item.portionGrams, 100)));
  const micros = optionalMicros(item);
  return {
    id: createId(),
    name,
    portionGrams,
    userAdjusted: false,
    source,
    macros: {
      calories: Math.max(0, Math.round(num(item.calories))),
      proteinG: Math.max(0, round1(num(item.proteinG))),
      carbsG: Math.max(0, round1(num(item.carbsG))),
      fatG: Math.max(0, round1(num(item.fatG))),
    },
    micros,
  };
}

function optionalMicros(item: Record<string, unknown>): Micros | undefined {
  const micros: Micros = {};
  const fiber = numOrNull(item.fiberG);
  const sugar = numOrNull(item.sugarG);
  const sodium = numOrNull(item.sodiumMg);
  const saturated = numOrNull(item.saturatedFatG);
  if (fiber !== null) micros.fiberG = Math.max(0, round1(fiber));
  if (sugar !== null) micros.sugarG = Math.max(0, round1(sugar));
  if (sodium !== null) micros.sodiumMg = Math.max(0, Math.round(sodium));
  if (saturated !== null) micros.saturatedFatG = Math.max(0, round1(saturated));
  return Object.keys(micros).length > 0 ? micros : undefined;
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numOrNull(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = num(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
