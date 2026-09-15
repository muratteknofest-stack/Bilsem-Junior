import { z } from 'zod';

export const PLANNER_PROMPT_VERSION = '1.0.0';

export interface PlannerParams {
  category: string;
  questionType: string;
  targetGrade: number;
  difficulty: number;
}

export const plannerOutputSchema = z.object({
  primaryRule: z.string().describe('The primary logical rule or pattern of the question'),
  secondaryRule: z.string().optional().describe('An optional secondary rule or distraction element'),
  distractorStrategy: z.string().describe('The strategy for creating plausible incorrect options'),
  requiredReasoningSteps: z.array(z.string()).min(1).describe('Step-by-step reasoning required to solve the problem'),
  skills: z.array(z.string()).min(1).describe('Specific cognitive skills targeted by this question'),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

/**
 * Builds the prompt for the Question Planner stage.
 * The planner creates a blueprint/plan for a question before actual generation.
 * @param params The parameters for planning the question
 * @returns The formatted prompt string
 */
export function buildPlannerPrompt(params: PlannerParams): string {
  return `Sen uzman bir BİLSEM (Bilim ve Sanat Merkezleri) sınav sorusu tasarımcısı ve eğitim psikoloğusun. 
Görevin, ${params.targetGrade}. sınıf öğrencileri (yaklaşık 7-11 yaş arası) için belirtilen kategori ve zorluk seviyesinde bir zeka sorusu taslağı (plan) oluşturmaktır.

Soru Parametreleri:
- Kategori (CognitiveCategory): ${params.category}
- Soru Tipi (QuestionType): ${params.questionType}
- Hedef Sınıf (TargetGrade): ${params.targetGrade}
- Zorluk Seviyesi (Difficulty, 1-6 arası, 6 en zor): ${params.difficulty}

Lütfen bu soru için detaylı bir kurgu planı (blueprint) oluştur. Planın şu temel bileşenleri içermelidir:
1. Ana Kural (primaryRule): Sorunun çözümü için gerekli olan temel mantık veya örüntü kuralı.
2. İkincil Kural (secondaryRule, isteğe bağlı): Soruyu karmaşıklaştıran veya dikkat gerektiren ek bir kural.
3. Çeldirici Stratejisi (distractorStrategy): Yanlış ama mantıklı görünen seçeneklerin (çeldiricilerin) nasıl üretileceği. (Örn: "Öğrenci sadece şekle bakıp rengi unutursa A seçeneğini işaretler")
4. Gerekli Akıl Yürütme Adımları (requiredReasoningSteps): Soruyu çözmek için çocuğun zihninde atması gereken adımlar.
5. Hedeflenen Beceriler (skills): Bu sorunun ölçtüğü spesifik bilişsel beceriler.

Geçerli Soru Tipleri (QuestionType): odd_one_out, visual_sequence, matrix_2x2, figure_rotation, mirror_reflection, symmetry_completion, figure_completion, spatial_relationship, visual_analogy, shape_counting, direction_path, visual_memory, symbol_coding, classification, visual_attention, number_pattern, logical_sequence, matrix_3x3, shape_equation, latin_square, shadow_matching, balance_scale, gear_rotation, paper_folding, venn_diagram, cube_counting, dice_unfold, cryptogram, operation_machine, top_view, shape_combination, verbal_analogy, number_pyramid, story_logic, tangram_puzzle, maze_path, logic_grid, punch_folding, detail_detection, weight_comparison, multiview_perspective, raven_matrix, word_scramble_logic, spatial_origami
Geçerli Kategoriler (CognitiveCategory): visual_perception, pattern, matrix, spatial, logic, attention, memory, numerical, verbal, coding

BİLSEM soru tasarım ilkelerine (yaşa uygunluk, çeldiricilerin mantıklı bir pedagojik temele dayanması) dikkat et.
Çıktın kesinlikle JSON formatında olmalı ve belirtilen şemaya uygun olmalıdır.`;
}
