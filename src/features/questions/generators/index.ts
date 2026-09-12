import { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { validateQuestion } from '../validator';
import { GRADE_CONFIGS } from '../grade-config';

// Import all 18 procedural generators
import { generateOddOneOutQuestion } from './odd-one-out';
import { generateVisualSequenceQuestion } from './visual-sequence';
import { generateFigureRotationQuestion } from './figure-rotation';
import { generateMatrix2x2Question } from './matrix-2x2';
import { generateMirrorReflectionQuestion } from './mirror-reflection';
import {
  generateSymmetryCompletionQuestion,
  generateFigureCompletionQuestion,
  generateSpatialRelationshipQuestion,
  generateVisualAnalogyQuestion,
  generateShapeCountingQuestion,
} from './spatial-engines';
import {
  generateDirectionPathQuestion,
  generateVisualMemoryQuestion,
  generateSymbolCodingQuestion,
  generateClassificationQuestion,
  generateVisualAttentionQuestion,
  generateNumberPatternQuestion,
  generateLogicalSequenceQuestion,
  generateMatrix3x3Question,
} from './logic-engines';
import {
  generateShapeEquationQuestion,
  generateLatinSquareQuestion,
  generateShadowMatchingQuestion,
  generateBalanceScaleQuestion,
  generateGearRotationQuestion,
  generatePaperFoldingQuestion,
  generateVennDiagramQuestion,
  generateCubeCountingQuestion,
  generateDiceUnfoldQuestion,
  generateCryptogramQuestion,
} from './extended-engines';

import {
  generateOperationMachineQuestion,
  generateTopViewQuestion,
  generateShapeCombinationQuestion,
  generateVerbalAnalogyQuestion,
  generateNumberPyramidQuestion,
  generateStoryLogicQuestion,
} from './advanced-engines';

import {
  generateTangramPuzzleQuestion,
  generateMazePathQuestion,
  generateLogicGridQuestion,
  generatePunchFoldingQuestion,
  generateDetailDetectionQuestion,
  generateWeightComparisonQuestion,
  generateMultiviewPerspectiveQuestion,
  generateRavenMatrixQuestion,
  generateWordScrambleLogicQuestion,
  generateSpatialOrigamiQuestion,
} from './creative-engines';

export const ALL_QUESTION_TYPES: QuestionType[] = [
  'odd_one_out',
  'visual_sequence',
  'matrix_2x2',
  'figure_rotation',
  'mirror_reflection',
  'symmetry_completion',
  'figure_completion',
  'spatial_relationship',
  'visual_analogy',
  'shape_counting',
  'direction_path',
  'visual_memory',
  'symbol_coding',
  'classification',
  'visual_attention',
  'number_pattern',
  'logical_sequence',
  'matrix_3x3',
  'shape_equation',
  'latin_square',
  'shadow_matching',
  'balance_scale',
  'gear_rotation',
  'paper_folding',
  'venn_diagram',
  'cube_counting',
  'dice_unfold',
  'cryptogram',
  'operation_machine',
  'top_view',
  'shape_combination',
  'verbal_analogy',
  'number_pyramid',
  'story_logic',
  'tangram_puzzle',
  'maze_path',
  'logic_grid',
  'punch_folding',
  'detail_detection',
  'weight_comparison',
  'multiview_perspective',
  'raven_matrix',
  'word_scramble_logic',
  'spatial_origami',
];

export const CATEGORY_TYPES_MAP: Record<CognitiveCategory, QuestionType[]> = {
  visual_perception: ['odd_one_out', 'figure_completion', 'visual_attention', 'shadow_matching', 'shape_combination', 'tangram_puzzle', 'detail_detection'],
  pattern: ['visual_sequence', 'number_pattern', 'logical_sequence', 'word_scramble_logic'],
  matrix: ['matrix_2x2', 'matrix_3x3', 'raven_matrix'],
  spatial: ['figure_rotation', 'mirror_reflection', 'symmetry_completion', 'spatial_relationship', 'direction_path', 'gear_rotation', 'paper_folding', 'dice_unfold', 'top_view', 'maze_path', 'punch_folding', 'multiview_perspective', 'spatial_origami'],
  logic: ['visual_analogy', 'symbol_coding', 'classification', 'logical_sequence', 'latin_square', 'balance_scale', 'venn_diagram', 'cryptogram', 'verbal_analogy', 'story_logic', 'logic_grid'],
  attention: ['shape_counting', 'visual_attention', 'cube_counting', 'detail_detection'],
  memory: ['visual_memory'],
  numerical: ['number_pattern', 'shape_counting', 'shape_equation', 'operation_machine', 'number_pyramid', 'weight_comparison'],
  verbal: ['verbal_analogy', 'word_scramble_logic', 'classification'],
  coding: ['symbol_coding', 'cryptogram', 'logical_sequence', 'maze_path'],
};

export function generateQuestionByType(
  type: QuestionType,
  seed: number,
  difficulty: DifficultyLevel = 3,
  retryCount = 0
): BaseQuestion {
  let q: BaseQuestion;

  switch (type) {
    case 'odd_one_out':
      q = generateOddOneOutQuestion(seed, difficulty);
      break;
    case 'visual_sequence':
      q = generateVisualSequenceQuestion(seed, difficulty);
      break;
    case 'matrix_2x2':
      q = generateMatrix2x2Question(seed, difficulty);
      break;
    case 'figure_rotation':
      q = generateFigureRotationQuestion(seed, difficulty);
      break;
    case 'mirror_reflection':
      q = generateMirrorReflectionQuestion(seed, difficulty);
      break;
    case 'symmetry_completion':
      q = generateSymmetryCompletionQuestion(seed, difficulty);
      break;
    case 'figure_completion':
      q = generateFigureCompletionQuestion(seed, difficulty);
      break;
    case 'spatial_relationship':
      q = generateSpatialRelationshipQuestion(seed, difficulty);
      break;
    case 'visual_analogy':
      q = generateVisualAnalogyQuestion(seed, difficulty);
      break;
    case 'shape_counting':
      q = generateShapeCountingQuestion(seed, difficulty);
      break;
    case 'direction_path':
      q = generateDirectionPathQuestion(seed, difficulty);
      break;
    case 'visual_memory':
      q = generateVisualMemoryQuestion(seed, difficulty);
      break;
    case 'symbol_coding':
      q = generateSymbolCodingQuestion(seed, difficulty);
      break;
    case 'classification':
      q = generateClassificationQuestion(seed, difficulty);
      break;
    case 'visual_attention':
      q = generateVisualAttentionQuestion(seed, difficulty);
      break;
    case 'number_pattern':
      q = generateNumberPatternQuestion(seed, difficulty);
      break;
    case 'logical_sequence':
      q = generateLogicalSequenceQuestion(seed, difficulty);
      break;
    case 'matrix_3x3':
      q = generateMatrix3x3Question(seed, difficulty);
      break;
    case 'shape_equation':
      q = generateShapeEquationQuestion(seed, difficulty);
      break;
    case 'latin_square':
      q = generateLatinSquareQuestion(seed, difficulty);
      break;
    case 'shadow_matching':
      q = generateShadowMatchingQuestion(seed, difficulty);
      break;
    case 'balance_scale':
      q = generateBalanceScaleQuestion(seed, difficulty);
      break;
    case 'gear_rotation':
      q = generateGearRotationQuestion(seed, difficulty);
      break;
    case 'paper_folding':
      q = generatePaperFoldingQuestion(seed, difficulty);
      break;
    case 'venn_diagram':
      q = generateVennDiagramQuestion(seed, difficulty);
      break;
    case 'cube_counting':
      q = generateCubeCountingQuestion(seed, difficulty);
      break;
    case 'dice_unfold':
      q = generateDiceUnfoldQuestion(seed, difficulty);
      break;
    case 'cryptogram':
      q = generateCryptogramQuestion(seed, difficulty);
      break;
    case 'operation_machine':
      q = generateOperationMachineQuestion(seed, difficulty);
      break;
    case 'top_view':
      q = generateTopViewQuestion(seed, difficulty);
      break;
    case 'shape_combination':
      q = generateShapeCombinationQuestion(seed, difficulty);
      break;
    case 'verbal_analogy':
      q = generateVerbalAnalogyQuestion(seed, difficulty);
      break;
    case 'number_pyramid':
      q = generateNumberPyramidQuestion(seed, difficulty);
      break;
    case 'story_logic':
      q = generateStoryLogicQuestion(seed, difficulty);
      break;
    case 'tangram_puzzle':
      q = generateTangramPuzzleQuestion(seed, difficulty);
      break;
    case 'maze_path':
      q = generateMazePathQuestion(seed, difficulty);
      break;
    case 'logic_grid':
      q = generateLogicGridQuestion(seed, difficulty);
      break;
    case 'punch_folding':
      q = generatePunchFoldingQuestion(seed, difficulty);
      break;
    case 'detail_detection':
      q = generateDetailDetectionQuestion(seed, difficulty);
      break;
    case 'weight_comparison':
      q = generateWeightComparisonQuestion(seed, difficulty);
      break;
    case 'multiview_perspective':
      q = generateMultiviewPerspectiveQuestion(seed, difficulty);
      break;
    case 'raven_matrix':
      q = generateRavenMatrixQuestion(seed, difficulty);
      break;
    case 'word_scramble_logic':
      q = generateWordScrambleLogicQuestion(seed, difficulty);
      break;
    case 'spatial_origami':
      q = generateSpatialOrigamiQuestion(seed, difficulty);
      break;
    default:
      q = generateVisualSequenceQuestion(seed, difficulty);
  }

  // Automatic Quality Gate Validation
  const val = validateQuestion(q);
  if (!val.isValid) {
    if (retryCount < 3) {
      // Safe retry with salted seed
      return generateQuestionByType(type, seed + 10007, difficulty, retryCount + 1);
    } else {
      console.warn(`Question validation failed after 3 retries for type "${type}", seed ${seed}`, val.errors);
    }
  }

  return q;
}

export function generateQuestion(options: {
  category?: CognitiveCategory | 'mixed';
  difficulty?: DifficultyLevel;
  seed?: number;
  type?: QuestionType;
}): BaseQuestion {
  const seed = options.seed ?? Math.floor(Math.random() * 1000000);
  const rng = new SeededRNG(seed);
  const difficulty = options.difficulty ?? 3;

  let chosenType: QuestionType;

  if (options.type) {
    chosenType = options.type;
  } else if (options.category && options.category !== 'mixed') {
    const pool = CATEGORY_TYPES_MAP[options.category] || ALL_QUESTION_TYPES;
    chosenType = rng.pick(pool);
  } else {
    chosenType = rng.pick(ALL_QUESTION_TYPES);
  }

  return generateQuestionByType(chosenType, seed, difficulty);
}

export function generateQuestionForGrade(
  grade: 1 | 2 | 3 | 4,
  seed?: number,
  type?: QuestionType,
  difficulty?: DifficultyLevel
): BaseQuestion {
  const cfg = GRADE_CONFIGS[grade];
  const finalSeed = seed ?? Math.floor(Math.random() * 900000) + 100000;
  const rng = new SeededRNG(finalSeed);

  const finalType = type ?? rng.pick(cfg.recommendedTypes);
  const finalDifficulty = difficulty ?? cfg.defaultDifficulty;

  const q = generateQuestionByType(finalType, finalSeed, finalDifficulty);
  // Ensure appropriate ageGroup tag
  q.ageGroup = grade <= 2 ? '1-2' : '3-4';
  q.estimatedSeconds = cfg.timeLimitSeconds;
  return q;
}

