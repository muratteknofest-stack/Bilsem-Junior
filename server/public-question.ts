import type { BaseQuestion, PublicQuestion, VisualConfig, VisualData } from '../src/types';

// These fields either contain the answer directly or expose editorial/solver
// metadata that can turn a challenge payload into an answer key. Presentation
// objects are copied into a new object so future generator fields fail closed.
const PRIVATE_PRESENTATION_KEY = /^(?:answer|correct|isCorrect|solution|solverAnswer|missingPiece|distractorNotes|explanation|rationale|authoring|aiMeta|editorial|grading)/i;

function scrubPresentationValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubPresentationValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !PRIVATE_PRESENTATION_KEY.test(key))
      .map(([key, nested]) => [key, scrubPresentationValue(nested)]),
  );
}

/**
 * Builds the only question shape that may cross the pre-submission API
 * boundary. The public ID is opaque and intentionally unrelated to the
 * deterministic generator seed.
 */
export function toPublicQuestion(question: BaseQuestion, publicId: string): PublicQuestion {
  return {
    id: publicId,
    version: question.version,
    type: question.type,
    category: question.category,
    difficulty: question.difficulty,
    ageGroup: question.ageGroup,
    prompt: question.prompt,
    ...(question.secondaryPrompt ? { secondaryPrompt: question.secondaryPrompt } : {}),
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      fingerprint: option.fingerprint,
      visualData: scrubPresentationValue(option.visualData) as VisualData | null,
    })),
    estimatedSeconds: question.estimatedSeconds,
    skills: [...question.skills],
    visualConfig: scrubPresentationValue(question.visualConfig) as VisualConfig,
    ...(question.targetGrade ? { targetGrade: question.targetGrade } : {}),
    ...(question.targetGrades ? { targetGrades: [...question.targetGrades] } : {}),
  };
}
