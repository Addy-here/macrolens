export function createId(): string {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  if (cryptoId) return cryptoId;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
