import type { GoogleGenAI } from '@google/genai';

/**
 * Bilsem Junior is directed to children under 18. The Gemini Developer API
 * terms prohibit use in API clients directed towards, or likely to be used by,
 * that age group: https://ai.google.dev/gemini-api/terms#age-requirements
 *
 * Keep the existing nullable provider contract so hints, explanations and
 * daily plans use their local engines. An environment key must not silently
 * enable a remote provider. Replacing this requires a child-appropriate service
 * and a review of its data processing and parental notice requirements.
 */
export function getGeminiClient(): GoogleGenAI | null {
  return null;
}
