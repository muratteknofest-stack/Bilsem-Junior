import { QUESTION_TYPE_LABELS, type CognitiveCategory, type QuestionType } from '../../types';

/** One curriculum for the workshop, student engine, diagnostics and AI selector. */
export const ALL_TOPIC_TYPES = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[];
export const LEGACY_PROVED_TYPES: QuestionType[] = ['matrix_2x2','matrix_3x3','raven_matrix','visual_sequence','figure_rotation','mirror_reflection','number_pattern','operation_machine','symbol_coding','shape_counting','logic_grid','symmetry_completion','shape_combination','direction_path','number_pyramid'];
export const WORKSHOP_TYPES = ALL_TOPIC_TYPES.filter(type => !LEGACY_PROVED_TYPES.includes(type));
export const TOPIC_CATEGORY: Record<QuestionType, CognitiveCategory> = {
  odd_one_out:'visual_perception', visual_sequence:'pattern', matrix_2x2:'matrix', figure_rotation:'spatial', mirror_reflection:'spatial', symmetry_completion:'spatial', figure_completion:'visual_perception', spatial_relationship:'spatial', visual_analogy:'logic', shape_counting:'attention', direction_path:'spatial', visual_memory:'memory', symbol_coding:'coding', classification:'logic', visual_attention:'attention', number_pattern:'numerical', logical_sequence:'pattern', matrix_3x3:'matrix', shape_equation:'numerical', latin_square:'logic', shadow_matching:'visual_perception', balance_scale:'logic', gear_rotation:'spatial', paper_folding:'spatial', venn_diagram:'logic', cube_counting:'attention', dice_unfold:'spatial', cryptogram:'coding', operation_machine:'numerical', top_view:'spatial', shape_combination:'visual_perception', verbal_analogy:'verbal', number_pyramid:'numerical', story_logic:'logic', tangram_puzzle:'visual_perception', maze_path:'coding', logic_grid:'logic', punch_folding:'spatial', detail_detection:'attention', weight_comparison:'numerical', multiview_perspective:'spatial', raven_matrix:'matrix', word_scramble_logic:'verbal', spatial_origami:'spatial',
};
export const TOPIC_CATEGORY_TYPES = Object.fromEntries([...new Set(Object.values(TOPIC_CATEGORY))].map(category => [category, ALL_TOPIC_TYPES.filter(type => TOPIC_CATEGORY[type] === category)])) as Record<CognitiveCategory, QuestionType[]>;
export function topicAllowedForGrade(type: QuestionType, grade?: number): boolean {
  return grade !== 1 || !['operation_machine','matrix_3x3','raven_matrix'].includes(type);
}
