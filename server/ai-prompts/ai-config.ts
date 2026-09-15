// Centralized AI model configuration for question generation pipeline
// Models can be changed via environment variables without code changes

export const AI_MODELS = {
  QUESTION_PLANNER: process.env.AI_MODEL_QUESTION_PLANNER || 'gemini-3.1-pro',
  QUESTION_GENERATOR: process.env.AI_MODEL_QUESTION_GENERATOR || 'gemini-3.1-pro',
  QUESTION_VALIDATOR: process.env.AI_MODEL_QUESTION_VALIDATOR || 'gemini-3.1-pro',
} as const;

export const AI_GENERATION_CONFIG = {
  /** Maximum concurrent AI requests for bulk generation */
  MAX_CONCURRENT: 3,
  /** Timeout per question generation (ms) */
  TIMEOUT_MS: 30_000,
  /** Max retry attempts for transient AI failures */
  MAX_RETRIES: 3,
  /** Base delay for exponential backoff (ms) */
  RETRY_BASE_DELAY_MS: 1000,
  /** Default minimum quality score for publishing */
  MIN_QUALITY_SCORE: 85,
  /** Temperature for question generation */
  GENERATION_TEMPERATURE: 0.8,
  /** Temperature for validation (lower = more deterministic) */
  VALIDATION_TEMPERATURE: 0.1,
  /** Max output tokens for generation */
  MAX_OUTPUT_TOKENS: 4096,
} as const;

export type AiModelRole = keyof typeof AI_MODELS;
