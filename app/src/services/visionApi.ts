import type { FoodItem, Micros } from '../types';
import { createId } from '../utils/id';
import { readSelectedAiKey, type AiProvider } from './aiKey';

const PROMPT = `You estimate food in a photo for a nutrition log.
Reply with JSON only, no markdown, in this shape:
{"items":[{"name":"string","portionGrams":number,"calories":number,"proteinG":number,"carbsG":number,"fatG":number,"fiberG":number,"sugarG":number,"sodiumMg":number}]}
Rules:
- Include only foods and drinks you can actually see.
- portionGrams is the edible portion, not the whole package unless the whole package is the serving.
- Macros are for that portion, not per 100g.
- If the photo is not food, return {"items":[]}.`;

export class VisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VisionError';
  }
}

export async function analyzeFoodPhoto(input: {
  base64: string;
  mimeType: string;
}): Promise<FoodItem[]> {
  const selected = await readSelectedAiKey();
  if (!selected) {
    throw new VisionError('Add your API key in Settings before analyzing a photo.');
  }

  const raw = await requestEstimate(selected.provider, selected.model, selected.apiKey, input);
  return parseFoodItems(raw);
}

async function requestEstimate(
  provider: AiProvider,
  model: string,
  apiKey: string,
  input: { base64: string; mimeType: string },
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

    if (!response.ok) {
      throw new VisionError(await failureMessage(response));
    }

    const data = await response.json();
    const text = responseText(provider, data);
    if (typeof text !== 'string' || !text.trim()) {
      throw new VisionError('The model returned an empty estimate.');
    }
    return text;
  } catch (error) {
    if (error instanceof VisionError) throw error;
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
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function headers(provider: AiProvider, apiKey: string): Record<string, string> {
  if (provider === 'openai') {
    return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
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

function body(provider: AiProvider, model: string, input: { base64: string; mimeType: string }) {
  if (provider === 'openai') {
    return {
      model,
      response_format: { type: 'json_object' },
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

function responseText(provider: AiProvider, data: unknown) {
  if (provider === 'openai') {
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

async function failureMessage(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return 'That API key was rejected. Check it in Settings.';
  }
  let detail = '';
  try {
    const body = await response.text();
    detail = body.replace(/\s+/g, ' ').slice(0, 160);
  } catch {
    detail = '';
  }
  if (response.status === 429) return 'The provider rate-limited this key. Wait a moment and try again.';
  return detail
    ? `The AI request failed (${response.status}). ${detail}`
    : `The AI request failed (${response.status}).`;
}

export function parseFoodItems(raw: string): FoodItem[] {
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
    throw new VisionError('No food was recognized. Try a closer photo of the meal.');
  }

  return items.slice(0, 12).map(toFoodItem);
}

function toFoodItem(value: unknown): FoodItem {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Food';
  const portionGrams = Math.max(1, Math.round(num(item.portionGrams, 100)));
  const micros = optionalMicros(item);
  return {
    id: createId(),
    name,
    portionGrams,
    userAdjusted: false,
    source: 'vision-ai',
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
  if (fiber !== null) micros.fiberG = Math.max(0, round1(fiber));
  if (sugar !== null) micros.sugarG = Math.max(0, round1(sugar));
  if (sodium !== null) micros.sodiumMg = Math.max(0, Math.round(sodium));
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
