import type { z } from 'zod';

// The server AI endpoint remains the primary provider. When unavailable,
// callers use their existing deterministic pedagogical fallback.
export async function generateClientAiJson<T>(
  _prompt: string, _schema: z.ZodType<T>, _timeoutMs = 6500,
): Promise<T | null> {
  return null;
}
